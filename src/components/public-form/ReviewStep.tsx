'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { getVisiblePageFields } from '@/lib/logicEngine';
import type { FormField, FormPage } from '@/types/form';
import type { FieldValue } from '@/types/publicForm';
import { InlineFieldEdit } from './InlineFieldEdit';

// Sprint 13 (D1.2 / D1.2a), wireframe 36 "Review Before Submit". Every answer from every page on one
// flat screen: one card per page (card header = page title), each row the field label (small) over
// the answer (strong) with an Edit button. Edit swaps just that row for the real input in place
// (InlineFieldEdit). Pure presentation over the shell's form state — it holds no values and runs no
// validation of its own: the shell supplies `renderField` and `validateField`, so "Save answer"
// re-runs the form's existing per-page rules.
export interface ReviewStepProps {
  formTitle: string;
  pages: FormPage[];
  fields: FormField[];
  hiddenFieldIds: Set<string>;
  values: Record<string, FieldValue>;
  /** Chosen file names, by fieldId — a file answer is shown as its name. */
  fileNames: Record<string, string>;
  /** The shell's own field renderer, so an inline edit is the exact input the respondent filled. */
  renderField: (field: FormField) => ReactNode;
  /** Re-runs the existing validation for one field; resolves true when it passes. */
  validateField: (fieldId: string) => Promise<boolean>;
  /** Puts a field back to the value it had before an edit began (Cancel). */
  restoreField: (fieldId: string, value: FieldValue) => void;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  submitDisabled: boolean;
  submitError: string | null;
  primaryColor: string;
  /** The owner's button theme (style + radius) — same helper the live preview uses. */
  buttonStyle?: React.CSSProperties;
  /** Preview mode: shows the "nothing was submitted" note instead of the buttons after Submit. */
  previewSubmitted?: boolean;
  /** Extra content above the buttons — the Mode 2 email step / Mode 3 "responding as" line live here. */
  extra?: ReactNode;
}

function displayValue(field: FormField, value: FieldValue, fileName?: string): string {
  if (field.type === 'file_upload') return fileName ?? '—';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (value === undefined || value === null || value === '') return '—';
  return String(value);
}

export function ReviewStep({
  formTitle,
  pages,
  fields,
  hiddenFieldIds,
  values,
  fileNames,
  renderField,
  validateField,
  restoreField,
  onBack,
  onSubmit,
  isSubmitting,
  submitDisabled,
  submitError,
  buttonStyle,
  previewSubmitted,
  extra,
}: ReviewStepProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [original, setOriginal] = useState<FieldValue>(undefined);
  const [saving, setSaving] = useState(false);
  const editButtons = useRef<Record<string, HTMLButtonElement | null>>({});
  const lastEdited = useRef<string | null>(null);

  // Focus returns to the Edit button when the inline editor closes.
  useEffect(() => {
    if (editingId === null && lastEdited.current) {
      editButtons.current[lastEdited.current]?.focus();
      lastEdited.current = null;
    }
  }, [editingId]);

  const groups = pages
    .map((page, index) => ({
      page,
      title: page.title || `Page ${index + 1}`,
      fields: getVisiblePageFields(fields, page.id, hiddenFieldIds),
    }))
    .filter((g) => g.fields.length > 0);

  function startEdit(field: FormField) {
    setOriginal(values[field.fieldId]);
    setEditingId(field.fieldId);
  }

  function cancelEdit(fieldId: string) {
    restoreField(fieldId, original);
    lastEdited.current = fieldId;
    setEditingId(null);
  }

  async function saveEdit(fieldId: string) {
    setSaving(true);
    const valid = await validateField(fieldId);
    setSaving(false);
    if (!valid) return; // stay open — the renderer shows its own error
    lastEdited.current = fieldId;
    setEditingId(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <header>
        <span className="bg-caption font-semibold uppercase tracking-wide text-(--text-muted)">{formTitle}</span>
        <h2 className="bg-h3 text-(--text-primary)">Review your answers</h2>
        <p className="bg-body text-(--text-muted) mt-1">
          Check everything before submitting. Your answers are grouped by page.
        </p>
      </header>

      {groups.map((group) => (
        <section
          key={group.page.id}
          aria-label={group.title}
          className="rounded-lg border border-(--border-default) bg-(--surface-card)"
        >
          <h3 className="px-4 py-3 border-b border-(--border-default) bg-body font-semibold text-(--text-primary)">
            {group.title}
          </h3>
          <dl className="divide-y divide-(--border-subtle)">
            {group.fields.map((field) =>
              editingId === field.fieldId ? (
                <div key={field.fieldId} className="p-3">
                  <InlineFieldEdit
                    onSave={() => void saveEdit(field.fieldId)}
                    onCancel={() => cancelEdit(field.fieldId)}
                    isSaving={saving}
                  >
                    {renderField(field)}
                  </InlineFieldEdit>
                </div>
              ) : (
                <div key={field.fieldId} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <dt className="bg-caption text-(--text-muted)">{field.label}</dt>
                    <dd className="bg-body font-semibold text-(--text-primary) break-words">
                      {displayValue(field, values[field.fieldId], fileNames[field.fieldId])}
                    </dd>
                  </div>
                  <Button
                    ref={(el) => {
                      editButtons.current[field.fieldId] = el;
                    }}
                    type="button"
                    variant="secondary"
                    size="small"
                    className="shrink-0 min-h-11"
                    onClick={() => startEdit(field)}
                    disabled={editingId !== null || isSubmitting}
                    aria-label={`Edit ${field.label}`}
                  >
                    Edit
                  </Button>
                </div>
              )
            )}
          </dl>
        </section>
      ))}

      {extra}

      {submitError && (
        <p role="alert" className="bg-caption text-(--error-text) font-semibold">
          {submitError}
        </p>
      )}

      {previewSubmitted ? (
        <p className="bg-body-sm text-center text-(--text-muted) font-medium">
          This is a preview — nothing was submitted.
        </p>
      ) : (
        <div className="flex gap-3">
          <Button type="button" variant="secondary" className="flex-1" onClick={onBack} disabled={isSubmitting || editingId !== null}>
            Back
          </Button>
          <Button
            type="button"
            className="flex-1"
            style={buttonStyle}
            onClick={onSubmit}
            isLoading={isSubmitting}
            disabled={submitDisabled || editingId !== null}
            aria-label={isSubmitting ? 'Submitting your response...' : undefined}
          >
            Submit
          </Button>
        </div>
      )}
    </div>
  );
}
