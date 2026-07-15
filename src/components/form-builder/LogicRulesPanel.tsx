'use client';

import { useState } from 'react';
import { AlertTriangle, Pencil, Plus, X } from 'lucide-react';
import type { FormField, LogicRule } from '@/types/form';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/common/EmptyState';

export interface LogicRulesPanelProps {
  fields: FormField[];
  onAddRule: (fieldId: string, rule: LogicRule) => void;
  onUpdateRule: (oldFieldId: string, oldRuleIndex: number, newFieldId: string, rule: LogicRule) => void;
  onDeleteRule: (fieldId: string, ruleIndex: number) => void;
}

interface RuleEntry {
  sourceField: FormField;
  rule: LogicRule;
  ruleIndex: number;
}

function isChoiceField(field: FormField): field is Extract<FormField, { options: string[] }> {
  return field.type === 'dropdown' || field.type === 'multiple_choice' || field.type === 'checkbox';
}

const selectClass =
  'rounded-md border-2 border-neutral-200 px-2.5 h-[38px] text-[13px] bg-white outline-none focus:border-neutral-500';

export function LogicRulesPanel({ fields, onAddRule, onUpdateRule, onDeleteRule }: LogicRulesPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<{ fieldId: string; ruleIndex: number } | null>(null);
  const [sourceFieldId, setSourceFieldId] = useState('');
  const [value, setValue] = useState('');
  const [action, setAction] = useState<'show' | 'hide'>('show');
  const [targetFieldId, setTargetFieldId] = useState('');

  const visibleFields = fields.filter((f) => !f.deleted);
  const sourceOptions = visibleFields.filter((f) => f.type !== 'file_upload');
  const canAddRule = visibleFields.length >= 2;

  const rules: RuleEntry[] = fields.flatMap((f) =>
    (f.logicRules ?? []).map((rule, ruleIndex) => ({ sourceField: f, rule, ruleIndex }))
  );

  const sourceField = visibleFields.find((f) => f.fieldId === sourceFieldId) ?? null;
  const targetOptions = visibleFields.filter((f) => f.fieldId !== sourceFieldId);

  const openForm = () => {
    const firstSource = sourceOptions[0];
    const firstTarget = visibleFields.find((f) => f.fieldId !== firstSource?.fieldId);
    setEditing(null);
    setSourceFieldId(firstSource?.fieldId ?? '');
    setValue('');
    setAction('show');
    setTargetFieldId(firstTarget?.fieldId ?? '');
    setShowForm(true);
  };

  const openEditForm = (fieldId: string, ruleIndex: number, rule: LogicRule) => {
    setEditing({ fieldId, ruleIndex });
    setSourceFieldId(rule.condition.fieldId);
    setValue(rule.condition.value);
    setAction(rule.action);
    setTargetFieldId(rule.targetFieldId);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  const handleSourceChange = (id: string) => {
    setSourceFieldId(id);
    setValue('');
    if (id === targetFieldId) {
      setTargetFieldId(visibleFields.find((f) => f.fieldId !== id)?.fieldId ?? '');
    }
  };

  const canSave = sourceFieldId !== '' && targetFieldId !== '' && value.trim() !== '';

  const handleSave = () => {
    if (!canSave) return;
    const rule: LogicRule = {
      condition: { fieldId: sourceFieldId, operator: 'equals', value: value.trim() },
      action,
      targetFieldId,
    };
    if (editing) {
      onUpdateRule(editing.fieldId, editing.ruleIndex, sourceFieldId, rule);
    } else {
      onAddRule(sourceFieldId, rule);
    }
    closeForm();
  };

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-heading-2 text-neutral-800">Logic Rules</h2>
        <Button
          onClick={openForm}
          disabled={!canAddRule}
          title={!canAddRule ? 'Add at least 2 fields to create a logic rule.' : undefined}
        >
          <Plus size={14} className="mr-1.5" />
          Add Rule
        </Button>
      </div>

      {rules.length === 0 ? (
        <EmptyState
          heading="No logic rules yet"
          body="Rules let you show or hide fields based on respondent answers."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {rules.map(({ sourceField: sf, rule, ruleIndex }) => {
            const target = fields.find((f) => f.fieldId === rule.targetFieldId);
            const orphaned = !target || target.deleted;
            return (
              <div
                key={`${sf.fieldId}-${ruleIndex}`}
                className="flex items-center justify-between gap-3 p-3 bg-white border border-neutral-200 rounded-lg"
              >
                <div className="flex flex-col gap-1 min-w-0">
                  <p className="text-body-sm text-neutral-800">
                    <span className="font-semibold">IF</span> {sf.label} equals &lsquo;{rule.condition.value}&rsquo;{' '}
                    <span className="font-semibold">THEN</span> {rule.action === 'show' ? 'SHOW' : 'HIDE'}{' '}
                    {target?.label ?? 'Unknown field'}
                  </p>
                  {orphaned && (
                    <span className="inline-flex items-center gap-1 text-caption font-semibold text-warning">
                      <AlertTriangle size={12} />
                      Target field deleted &mdash; this rule has no effect.
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEditForm(sf.fieldId, ruleIndex, rule)}
                    className="text-neutral-400 hover:text-brand-700 min-w-[32px] min-h-[32px] flex items-center justify-center"
                    aria-label="Edit rule"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteRule(sf.fieldId, ruleIndex)}
                    className="text-neutral-400 hover:text-rose-600 min-w-[32px] min-h-[32px] flex items-center justify-center"
                    aria-label="Delete rule"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="flex flex-col gap-3 p-4 bg-white border border-neutral-200 rounded-lg">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">If field</span>
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
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Operator</span>
              <input
                value="equals"
                disabled
                readOnly
                className="rounded-md border-2 border-neutral-200 px-2.5 h-[38px] text-[13px] bg-neutral-100 text-neutral-500 outline-none"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Value</span>
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
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Action</span>
              <div className="flex rounded-md border-2 border-neutral-200 overflow-hidden h-[38px]">
                {(['show', 'hide'] as const).map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAction(a)}
                    className={`flex-1 text-[13px] font-semibold ${
                      action === a ? 'bg-brand-700 text-white' : 'bg-white text-neutral-600'
                    }`}
                  >
                    {a === 'show' ? 'SHOW' : 'HIDE'}
                  </button>
                ))}
              </div>
            </label>

            <label className="flex flex-col gap-1.5 col-span-2">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Target field</span>
              <select value={targetFieldId} onChange={(e) => setTargetFieldId(e.target.value)} className={selectClass}>
                {targetOptions.map((f) => (
                  <option key={f.fieldId} value={f.fieldId}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeForm}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!canSave}>
              {editing ? 'Update Rule' : 'Save Rule'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
