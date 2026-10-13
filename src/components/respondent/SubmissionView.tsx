'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import type { RespondLinkField, RespondentStatus } from '@/types/respondent';

// Sprint 13 (A5.2 / A5.1). A respondent's OWN answers, read-only, with an Edit mode that reuses the same
// plain controls for every field type. The caller supplies `onSave` (token path or signed-in path) and is
// responsible for the server round-trip; the server re-validates by the form's own rules, so this only keeps
// obviously-empty required answers from being sent. File answers are shown by name and not editable here.
export interface SubmissionViewProps {
  fields: RespondLinkField[];
  status?: RespondentStatus;
  canEdit: boolean;
  readOnlyReason?: string;
  onSave: (answers: Record<string, unknown>) => Promise<{ editedAfterReview?: boolean }>;
}

const REASONS: Record<string, string> = {
  closed: 'This form is closed, so submissions can no longer be changed.',
  archived: 'This form has been archived, so submissions can no longer be changed.',
  trashed: 'This form is no longer available, so submissions can no longer be changed.',
  finalised: 'This submission has been completed and can no longer be changed.',
};

// Binary or drawn answers can't be re-typed in a text box, so a respondent can't change them here.
const READ_ONLY_TYPES = new Set(['file_upload', 'image_upload', 'signature']);

const asText = (v: unknown): string => (Array.isArray(v) ? v.join(', ') : v === null || v === undefined || v === '' ? '' : String(v));

export function SubmissionView({ fields, status, canEdit, readOnlyReason, onSave }: SubmissionViewProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const start = () => {
    setDraft(Object.fromEntries(fields.filter((f) => !READ_ONLY_TYPES.has(f.type)).map((f) => [f.fieldId, f.value ?? ''])));
    setError(null);
    setNotice(null);
    setEditing(true);
  };

  const save = async () => {
    const missing = fields.find((f) => f.required && !READ_ONLY_TYPES.has(f.type) && asText(draft[f.fieldId]).trim() === '');
    if (missing) {
      setError(`"${missing.label}" is required.`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // A multi-value answer (checkboxes) is shown and edited as "a, b" text; send it back as a list, as it came.
      const payload = Object.fromEntries(
        Object.entries(draft).map(([id, v]) => {
          const wasList = Array.isArray(fields.find((f) => f.fieldId === id)?.value);
          return [id, wasList && typeof v === 'string' ? v.split(',').map((s) => s.trim()).filter(Boolean) : v];
        })
      );
      const result = await onSave(payload);
      setEditing(false);
      setNotice(result.editedAfterReview ? 'Edited — your reviewer has been told.' : 'Your changes were saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'We could not save your changes.');
    } finally {
      setSaving(false);
    }
  };

  const control = (f: RespondLinkField) => {
    const id = `edit-${f.fieldId}`;
    const value = asText(draft[f.fieldId]);
    if (f.options?.length && (f.type === 'dropdown' || f.type === 'multiple_choice')) {
      return (
        <Select id={id} label={f.label} value={value} onChange={(e) => setDraft({ ...draft, [f.fieldId]: e.target.value })}>
          <option value="">Select…</option>
          {f.options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
      );
    }
    if (f.type === 'long_text') {
      return <Textarea id={id} label={f.label} value={value} onChange={(e) => setDraft({ ...draft, [f.fieldId]: e.target.value })} />;
    }
    return (
      <Input
        id={id}
        label={f.label}
        type={f.type === 'email' ? 'email' : f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
        value={value}
        onChange={(e) => setDraft({ ...draft, [f.fieldId]: e.target.value })}
      />
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {status && (
        <p className="bg-body-sm text-(--text-muted)">
          Status: <Badge variant="neutral">{status}</Badge>
        </p>
      )}
      {notice && <Alert variant="success">{notice}</Alert>}
      {!canEdit && readOnlyReason && <Alert variant="info">{REASONS[readOnlyReason] ?? 'This submission can no longer be changed.'}</Alert>}

      {editing ? (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          {fields.map((f) =>
            READ_ONLY_TYPES.has(f.type) ? (
              <div key={f.fieldId}>
                <p className="bg-caption text-(--text-muted)">{f.label}</p>
                <p className="bg-body">{asText(f.value) || '—'} (this answer cannot be changed here)</p>
              </div>
            ) : (
              <div key={f.fieldId}>{control(f)}</div>
            )
          )}
          {error && (
            <p role="alert" className="bg-caption font-semibold text-(--error-text)">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setEditing(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" isLoading={saving}>
              Save changes
            </Button>
          </div>
        </form>
      ) : (
        <>
          <dl className="divide-y divide-(--border-subtle) rounded-lg border border-(--border-default)">
            {fields.map((f) => (
              <div key={f.fieldId} className="px-4 py-3">
                <dt className="bg-caption text-(--text-muted)">{f.label}</dt>
                <dd className="bg-body font-semibold text-(--text-primary) break-words">{asText(f.value) || '—'}</dd>
              </div>
            ))}
          </dl>
          {canEdit && (
            <div className="flex justify-end">
              <Button type="button" onClick={start} className="min-h-11">
                Edit my answers
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
