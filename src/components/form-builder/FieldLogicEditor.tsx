'use client';

import { useState } from 'react';
import { AlertTriangle, Pencil, Plus, X } from 'lucide-react';
import type { FormField, LogicRule } from '@/types/form';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';

export interface FieldLogicEditorProps {
  field: FormField;
  allFields: FormField[];
  onAddRule: (fieldId: string, rule: LogicRule) => void;
  onUpdateRule: (oldFieldId: string, oldRuleIndex: number, newFieldId: string, rule: LogicRule) => void;
  onDeleteRule: (fieldId: string, ruleIndex: number) => void;
}

interface IncomingRule {
  sourceField: FormField;
  rule: LogicRule;
  ruleIndex: number;
}

function isChoiceField(field: FormField): field is Extract<FormField, { options: string[] }> {
  return field.type === 'dropdown' || field.type === 'multiple_choice' || field.type === 'checkbox';
}

const selectClass =
  'rounded-md border-2 border-(--border-default) px-2.5 min-h-11 bg-body-sm bg-(--surface-card) outline-none focus:border-(--border-strong)';

// ─── Main Component ───────────────────────────────────────────────────────────
// Rendered inline inside the selected FieldCard, below FieldInlineEditor.
// Target-centric: shows/edits rules whose targetFieldId is THIS field (i.e.
// "when is this field shown/hidden"), not rules where this field is the source.
// To create "if X then show/hide Y", you do it from Y's card, not X's — see the
// canvas-redesign plan for the reasoning.

export function FieldLogicEditor({ field, allFields, onAddRule, onUpdateRule, onDeleteRule }: FieldLogicEditorProps) {
  const incomingRules: IncomingRule[] = allFields.flatMap((f) =>
    (f.logicRules ?? [])
      .map((rule, ruleIndex) => ({ sourceField: f, rule, ruleIndex }))
      .filter(({ rule }) => rule.targetFieldId === field.fieldId)
  );

  const [expanded, setExpanded] = useState(incomingRules.length > 0);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<{ fieldId: string; ruleIndex: number } | null>(null);
  const [sourceFieldId, setSourceFieldId] = useState('');
  const [value, setValue] = useState('');
  const [action, setAction] = useState<'show' | 'hide'>('show');

  const [prevFieldId, setPrevFieldId] = useState(field.fieldId);
  if (field.fieldId !== prevFieldId) {
    setExpanded(incomingRules.length > 0);
    setShowForm(false);
    setEditing(null);
    setPrevFieldId(field.fieldId);
  }

  const sourceOptions = allFields.filter(
    (f) => !f.deleted && f.fieldId !== field.fieldId && f.type !== 'file_upload' && f.type !== 'image_upload' && f.type !== 'signature'
  );
  const canAddRule = sourceOptions.length > 0;
  const sourceField = sourceOptions.find((f) => f.fieldId === sourceFieldId) ?? null;

  const openForm = () => {
    setEditing(null);
    setSourceFieldId(sourceOptions[0]?.fieldId ?? '');
    setValue('');
    setAction('show');
    setShowForm(true);
  };

  const openEditForm = (sourceId: string, ruleIndex: number, rule: LogicRule) => {
    setEditing({ fieldId: sourceId, ruleIndex });
    setSourceFieldId(rule.condition.fieldId);
    setValue(rule.condition.value);
    setAction(rule.action);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  const handleSourceChange = (id: string) => {
    setSourceFieldId(id);
    setValue('');
  };

  const canSave = sourceFieldId !== '' && value.trim() !== '';

  const handleSave = () => {
    if (!canSave) return;
    const rule: LogicRule = {
      condition: { fieldId: sourceFieldId, operator: 'equals', value: value.trim() },
      action,
      targetFieldId: field.fieldId,
    };
    if (editing) {
      onUpdateRule(editing.fieldId, editing.ruleIndex, sourceFieldId, rule);
    } else {
      onAddRule(sourceFieldId, rule);
    }
    closeForm();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="bg-overline text-(--text-muted)">
          Conditional Logic
        </span>
        <Switch id={`${field.fieldId}-logic-toggle`} aria-label="Conditional logic" checked={expanded} onChange={setExpanded} />
      </div>

      {expanded && (
        <div className="flex flex-col gap-3">
          {incomingRules.length > 0 && (
            <div className="flex flex-col gap-2">
              {incomingRules.map(({ sourceField: sf, rule, ruleIndex }) => (
                <div
                  key={`${sf.fieldId}-${ruleIndex}`}
                  className="flex items-center justify-between gap-3 p-3 bg-(--surface-card) border border-(--border-default) rounded-lg"
                >
                  <div className="flex flex-col gap-1 min-w-0">
                    <p className="bg-body-sm text-(--text-primary)">
                      <span className="font-semibold">IF</span> {sf.label} equals &lsquo;{rule.condition.value}&rsquo;{' '}
                      <span className="font-semibold">THEN</span> {rule.action === 'show' ? 'SHOW' : 'HIDE'} this field
                    </p>
                    {sf.deleted && (
                      <span className="inline-flex items-center gap-1 bg-caption font-semibold text-(--warning-text)">
                        <AlertTriangle size={12} />
                        Source field deleted &mdash; this rule has no effect.
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditForm(sf.fieldId, ruleIndex, rule)}
                      className="text-(--text-disabled) hover:text-(--accent-soft-text) min-w-11 min-h-11 flex items-center justify-center"
                      aria-label="Edit condition"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteRule(sf.fieldId, ruleIndex)}
                      className="text-(--text-disabled) hover:text-(--error-text) min-w-11 min-h-11 flex items-center justify-center"
                      aria-label="Delete condition"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!showForm && (
            <Button
              variant="secondary"
              size="small"
              onClick={openForm}
              disabled={!canAddRule}
              title={!canAddRule ? 'Add another field to create a condition.' : undefined}
            >
              <Plus size={14} className="mr-1.5" />
              Add condition
            </Button>
          )}

          {showForm && (
            <div className="flex flex-col gap-3 p-3 bg-(--surface-card) border border-(--border-default) rounded-lg">
              <div className="grid grid-cols-1 min-[881px]:grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="bg-overline text-(--text-muted)">If field</span>
                  <select
                    value={sourceFieldId}
                    onChange={(e) => handleSourceChange(e.target.value)}
                    className={selectClass}
                  >
                    {sourceOptions.map((f) => (
                      <option key={f.fieldId} value={f.fieldId}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="bg-overline text-(--text-muted)">Operator</span>
                  <input
                    value="equals"
                    disabled
                    readOnly
                    className="rounded-md border-2 border-(--border-default) px-2.5 min-h-11 bg-body-sm bg-(--bg-sunken) text-(--text-muted) outline-none"
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="bg-overline text-(--text-muted)">Value</span>
                  {sourceField && isChoiceField(sourceField) ? (
                    <select value={value} onChange={(e) => setValue(e.target.value)} className={selectClass}>
                      <option value="">Select a value</option>
                      {sourceField.options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      placeholder="Value to match"
                      className={selectClass}
                    />
                  )}
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="bg-overline text-(--text-muted)">Then</span>
                  <div className="flex min-h-11 rounded-md border-2 border-(--border-default) overflow-hidden">
                    {(['show', 'hide'] as const).map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => setAction(a)}
                        className={`flex-1 bg-body-sm font-semibold ${
                          action === a ? 'bg-(--action-primary-hover) text-(--text-on-brand)' : 'bg-(--surface-card) text-(--text-secondary)'
                        }`}
                      >
                        {a === 'show' ? 'SHOW' : 'HIDE'}
                      </button>
                    ))}
                  </div>
                </label>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="secondary" size="small" onClick={closeForm}>
                  Cancel
                </Button>
                <Button size="small" onClick={handleSave} disabled={!canSave}>
                  {editing ? 'Update condition' : 'Save condition'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
