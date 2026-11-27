'use client';

import { Fragment, useState } from 'react';
import { AlertTriangle, Pencil, Plus, X } from 'lucide-react';
import type { FormField, LogicRule } from '@/types/form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { SegmentedRadio } from '@/components/ui/SegmentedRadio';
import { dependentsOf } from '@/lib/logicGraph';
import { yesNoWords } from '@/lib/fieldDisplay';

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

/** The answers a question can only be given from: offered as a list, so a condition cannot be mistyped. */
function answerChoices(source: FormField): { value: string; label: string }[] | null {
  if (source.type === 'dropdown' || source.type === 'multiple_choice' || source.type === 'checkbox') {
    return source.options.map((o) => ({ value: o, label: o }));
  }
  if (source.type === 'yes_no') {
    const words = yesNoWords(source);
    return [{ value: 'Yes', label: words.yes }, { value: 'No', label: words.no }];
  }
  if (source.type === 'rating') return [1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n} of 5 stars` }));
  return null;
}

const INPUT_TYPES: Partial<Record<FormField['type'], string>> = {
  number: 'number',
  currency: 'number',
  date: 'date',
  time: 'time',
  datetime: 'datetime-local',
};

/** What the listed conditions add up to. A met "hide" condition wins over a met "show" one (lib/logicEngine, and the server). */
function summaryOf(rules: IncomingRule[]): string {
  const shows = rules.filter((r) => r.rule.action === 'show').length;
  if (shows === rules.length) return rules.length > 1 ? 'Shown when any one of these is true. Hidden otherwise.' : 'Shown only when this is true.';
  if (shows === 0) return rules.length > 1 ? 'Hidden when any one of these is true.' : 'Hidden when this is true.';
  return 'Shown when a “Show” condition is true and no “Hide” condition is.';
}

// Main Component
// One tab of the open FieldCard. Target-centric: shows/edits rules whose targetFieldId is THIS field (i.e.
// "when is this field shown/hidden"), not rules where this field is the source.
// To create "if X then show/hide Y", you do it from Y's card, not X's.

export function FieldLogicEditor({ field, allFields, onAddRule, onUpdateRule, onDeleteRule }: FieldLogicEditorProps) {
  const incomingRules: IncomingRule[] = allFields.flatMap((f) =>
    (f.logicRules ?? [])
      .map((rule, ruleIndex) => ({ sourceField: f, rule, ruleIndex }))
      .filter(({ rule }) => rule.targetFieldId === field.fieldId)
  );

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<{ fieldId: string; ruleIndex: number } | null>(null);
  const [sourceFieldId, setSourceFieldId] = useState('');
  const [value, setValue] = useState('');
  const [action, setAction] = useState<'show' | 'hide'>('show');

  const [prevFieldId, setPrevFieldId] = useState(field.fieldId);
  if (field.fieldId !== prevFieldId) {
    setShowForm(false);
    setEditing(null);
    setPrevFieldId(field.fieldId);
  }

  // Fields this one already (transitively) shows or hides cannot be its trigger: that would be a loop in which
  // neither field is ever shown.
  const decidedByThisField = dependentsOf(allFields, field.fieldId);
  const sourceOptions = allFields.filter(
    (f) =>
      !f.deleted &&
      f.fieldId !== field.fieldId &&
      !decidedByThisField.has(f.fieldId) &&
      f.type !== 'file_upload' &&
      f.type !== 'image_upload' &&
      f.type !== 'signature'
  );
  const canAddRule = sourceOptions.length > 0;
  const sourceField = sourceOptions.find((f) => f.fieldId === sourceFieldId) ?? null;
  const choices = sourceField ? answerChoices(sourceField) : null;
  const inputType = (sourceField && INPUT_TYPES[sourceField.type]) || 'text';
  // The server refuses to save a required question that a condition can hide.
  const requiredClash = field.required && incomingRules.some((r) => r.rule.action === 'hide');
  const hideRequired = field.required && action === 'hide';
  const canSave = sourceFieldId !== '' && value.trim() !== '' && !hideRequired;

  const openForm = () => {
    setEditing(null);
    setSourceFieldId(sourceOptions[0]?.fieldId ?? '');
    setValue('');
    // A further condition usually does the same as the one before it.
    setAction(incomingRules.at(-1)?.rule.action ?? 'show');
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

  const warning = (text: string) => (
    <p role="alert" className="flex items-start gap-2 rounded-lg bg-(--warning-surface) px-3 py-2 bg-body-sm text-(--warning-text)">
      <AlertTriangle size={14} aria-hidden="true" className="mt-0.5 shrink-0" />
      {text}
    </p>
  );

  return (
    <div className="flex flex-col gap-3">
      <p className="bg-body-sm text-(--text-muted)">
        {incomingRules.length > 0
          ? summaryOf(incomingRules)
          : canAddRule
            ? 'This question is always shown. Add a condition to show or hide it based on the answer to another question.'
            : 'This question is always shown. Add another question first: a condition checks the answer to a different one.'}
      </p>

      {requiredClash && warning('This question is required and can be hidden, so the form cannot be saved. Turn Required off, or remove the “Hide” condition.')}

      {incomingRules.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {incomingRules.map(({ sourceField: sf, rule, ruleIndex }, i) => {
            const answer = answerChoices(sf)?.find((c) => c.value === rule.condition.value)?.label ?? rule.condition.value;
            return (
              <Fragment key={`${sf.fieldId}-${ruleIndex}`}>
                {i > 0 && incomingRules[i - 1].rule.action === rule.action && (
                  <li aria-hidden="true" className="pl-3 bg-caption font-semibold text-(--text-muted)">or</li>
                )}
                <li className="flex items-center justify-between gap-3 rounded-lg border border-(--border-default) bg-(--surface-card) py-1 pl-3 pr-1">
                  <div className="flex min-w-0 flex-col gap-1 py-1.5">
                    <p className="wrap-break-word bg-body-sm text-(--text-primary)">
                      <span className="font-semibold">{rule.action === 'show' ? 'Show' : 'Hide'}</span> when{' '}
                      <span className="font-semibold">{sf.label}</span> is <span className="font-semibold">“{answer}”</span>
                    </p>
                    {sf.deleted && (
                      <span className="inline-flex items-center gap-1 bg-caption font-semibold text-(--warning-text)">
                        <AlertTriangle size={12} />
                        Source field deleted &mdash; this rule has no effect.
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center">
                    <button
                      type="button"
                      onClick={() => openEditForm(sf.fieldId, ruleIndex, rule)}
                      className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-(--text-muted) hover:bg-(--accent-soft) hover:text-(--accent-soft-text)"
                      aria-label="Edit condition"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteRule(sf.fieldId, ruleIndex)}
                      className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-(--text-muted) hover:bg-(--error-surface) hover:text-(--error-text)"
                      aria-label="Delete condition"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </li>
              </Fragment>
            );
          })}
        </ul>
      )}

      {!showForm && (
        <Button
          variant="secondary"
          size="small"
          className="self-start"
          onClick={openForm}
          disabled={!canAddRule}
          title={!canAddRule ? 'Add another field to create a condition.' : undefined}
        >
          <Plus size={14} className="mr-1.5" />
          {incomingRules.length > 0 ? 'Add another condition' : 'Add condition'}
        </Button>
      )}

      {/* Read top to bottom as one sentence: Show this question / when the answer to X / is Y. */}
      {showForm && (
        <div className="flex flex-col gap-3 rounded-lg border border-(--border-default) bg-(--bg-subtle) p-3">
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedRadio
              ariaLabel="What happens"
              value={action}
              onChange={(id) => setAction(id as 'show' | 'hide')}
              options={[{ id: 'show', label: 'Show' }, { id: 'hide', label: 'Hide' }]}
            />
            <span className="bg-body-sm text-(--text-secondary)">this question</span>
          </div>

          {hideRequired && warning('A required question cannot be hidden. Turn Required off first, or choose Show.')}

          <div className="grid grid-cols-1 gap-3 min-[881px]:grid-cols-2">
            <Select id={`${field.fieldId}-rule-source`} label="When the answer to" value={sourceFieldId} onChange={(e) => handleSourceChange(e.target.value)}>
              {sourceOptions.map((f) => (
                <option key={f.fieldId} value={f.fieldId}>
                  {f.label}
                </option>
              ))}
            </Select>

            {choices ? (
              <Select id={`${field.fieldId}-rule-value`} label="is" value={value} onChange={(e) => setValue(e.target.value)}>
                <option value="">Choose an answer</option>
                {choices.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            ) : (
              <div className="flex flex-col gap-1">
                <Input
                  id={`${field.fieldId}-rule-value`}
                  label="is"
                  type={inputType}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="Type the answer"
                />
                {inputType === 'text' && <p className="bg-caption text-(--text-muted)">It must match exactly, capital letters included.</p>}
              </div>
            )}
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
  );
}
