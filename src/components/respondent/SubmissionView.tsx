'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { bx } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
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

const STATUS_VARIANT: Record<RespondentStatus, 'new' | 'in_progress' | 'completed' | 'neutral'> = {
  Received: 'new',
  'In review': 'in_progress',
  Completed: 'completed',
  Edited: 'neutral',
};
const STEPS = ['Received', 'In review', 'Completed'];
const STEP_OF: Record<RespondentStatus, number> = { Received: 0, 'In review': 1, Edited: 1, Completed: 2 };
const STATUS_HINT: Record<RespondentStatus, string> = {
  Received: 'We have your submission.',
  'In review': 'It is being looked at.',
  Edited: 'You changed it after it was reviewed.',
  Completed: 'This one is finished.',
};

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
        <Card className="gap-4">
          <div className="flex flex-col gap-1">
            <p className="m-0 flex flex-wrap items-center gap-2 bg-body-sm font-semibold text-(--text-primary)">
              Status: <StatusBadge variant={STATUS_VARIANT[status] ?? 'neutral'}>{status}</StatusBadge>
            </p>
            <p className="m-0 bg-body-sm text-(--text-muted)">{STATUS_HINT[status]}</p>
          </div>
          {/* Where it stands in the three steps a submission goes through. "Edited" means it was changed after review, so it sits on the review step. */}
          <ol aria-hidden="true" className="m-0 flex list-none items-center p-0">
            {STEPS.map((label, i) => {
              const at = STEP_OF[status] ?? 0;
              const done = i < at;
              const current = i === at;
              return (
                <li key={label} className={bx('flex items-center', i < STEPS.length - 1 && 'flex-1')}>
                  <span className="flex items-center gap-2">
                    <span
                      className={bx(
                        'flex size-5 shrink-0 items-center justify-center rounded-full border-2',
                        done || current ? 'border-(--action-primary) bg-(--action-primary)' : 'border-(--border-strong) bg-(--surface-card)'
                      )}
                    >
                      {(done || (current && at === STEPS.length - 1)) && <Check size={12} className="text-(--text-on-brand)" />}
                    </span>
                    <span className={bx('bg-caption', current ? 'font-semibold text-(--text-primary)' : 'text-(--text-muted)')}>{label}</span>
                  </span>
                  {i < STEPS.length - 1 && <span className={bx('mx-3 h-0.5 flex-1 rounded-full', done ? 'bg-(--action-primary)' : 'bg-(--border-default)')} />}
                </li>
              );
            })}
          </ol>
        </Card>
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
          <Card padded={false} role="region" aria-label="Your answers" className="overflow-hidden">
            <div className="border-b border-(--border-subtle) bg-(--bg-subtle) px-5 py-3">
              <h2 className="bg-overline m-0 text-(--text-muted)">Your answers</h2>
            </div>
            <dl className="m-0 divide-y divide-(--border-subtle)">
              {fields.map((f, i) => {
                const text = asText(f.value);
                return (
                  <div key={f.fieldId} className="flex items-start gap-4 px-5 py-4">
                    <span aria-hidden="true" className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-(--accent-soft) bg-caption font-semibold text-(--accent-soft-text)">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <dt className="bg-caption text-(--text-muted)">{f.label}</dt>
                      <dd className={text ? 'm-0 mt-0.5 bg-body font-semibold text-(--text-primary) break-words' : 'm-0 mt-0.5 bg-body text-(--text-disabled)'}>{text || '—'}</dd>
                    </div>
                  </div>
                );
              })}
            </dl>
          </Card>
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
