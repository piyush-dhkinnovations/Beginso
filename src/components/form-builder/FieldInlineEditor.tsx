'use client';

import React, { useState } from 'react';
import type { FormField } from '@/types/form';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { OptionsEditor } from './OptionsEditor';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TEXT_TYPES = new Set([
  'short_text',
  'long_text',
  'email',
  'phone',
  'number',
  'date',
]);

// Platform-enforced allowlist — not configurable per-field, so it's a constant, not state.
const ALLOWED_FILE_TYPE_LABELS = ['PDF', 'Word', 'Excel', 'Images', 'Video (MP4)', 'ZIP', 'Plain text'];

// ─── Small sub-component: a labelled section ───────────────────────────────────

export function PanelSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
        {label}
      </span>
      {children}
    </div>
  );
}

// ─── On-blur text field helper ────────────────────────────────────────────────

function BlurField({
  id,
  label,
  defaultValue,
  placeholder,
  allowEmpty = false,
  type = 'text',
  min,
  onCommit,
}: {
  id: string;
  label: string;
  defaultValue: string;
  placeholder?: string;
  allowEmpty?: boolean;
  type?: string;
  min?: number;
  onCommit: (value: string) => void;
}) {
  const [local, setLocal] = useState(defaultValue);
  const [prevDefault, setPrevDefault] = useState(defaultValue);

  if (defaultValue !== prevDefault) {
    setLocal(defaultValue);
    setPrevDefault(defaultValue);
  }

  const commit = () => {
    const trimmed = local.trim();
    if (trimmed !== defaultValue) {
      onCommit(!allowEmpty && !trimmed ? defaultValue : trimmed);
    }
  };

  return (
    <Input
      id={id}
      label={label}
      type={type}
      min={min}
      value={local}
      placeholder={placeholder}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          (e.target as HTMLInputElement).blur();
        }
      }}
    />
  );
}

// ─── Shared property sections (label / help text / required — reused across field-type branches) ──

function LabelField({
  uid,
  fieldId,
  label,
  onUpdate,
}: {
  uid: string;
  fieldId: string;
  label: string;
  onUpdate: (fieldId: string, updates: Partial<FormField>) => void;
}) {
  return (
    <PanelSection label="Label">
      <BlurField
        id={`${uid}-label`}
        label=""
        defaultValue={label}
        placeholder="Field label"
        onCommit={(v) => onUpdate(fieldId, { label: v })}
      />
    </PanelSection>
  );
}

function HelpTextField({
  uid,
  fieldId,
  helpText,
  onUpdate,
}: {
  uid: string;
  fieldId: string;
  helpText: string;
  onUpdate: (fieldId: string, updates: Partial<FormField>) => void;
}) {
  return (
    <PanelSection label="Help text">
      <BlurField
        id={`${uid}-help`}
        label=""
        defaultValue={helpText}
        placeholder="Optional helper copy below the field"
        allowEmpty={true}
        onCommit={(v) => onUpdate(fieldId, { helpText: v })}
      />
    </PanelSection>
  );
}

function RequiredToggle({
  uid,
  fieldId,
  required,
  onUpdate,
}: {
  uid: string;
  fieldId: string;
  required: boolean;
  onUpdate: (fieldId: string, updates: Partial<FormField>) => void;
}) {
  return (
    <PanelSection label="Validation">
      <div className="flex items-center justify-between py-1">
        <label
          htmlFor={`${uid}-required`}
          className="text-body-sm font-medium text-neutral-700 cursor-pointer"
        >
          Required field
        </label>
        <Switch
          id={`${uid}-required`}
          checked={required}
          onChange={(v) => onUpdate(fieldId, { required: v })}
        />
      </div>
    </PanelSection>
  );
}

// ─── Number field: min/max range (cross-field validation on blur) ─────────────

function NumberRangeSection({
  fieldId,
  min,
  max,
  onUpdate,
}: {
  fieldId: string;
  min?: number;
  max?: number;
  onUpdate: (fieldId: string, updates: Partial<FormField>) => void;
}) {
  const [minStr, setMinStr] = useState(min?.toString() ?? '');
  const [maxStr, setMaxStr] = useState(max?.toString() ?? '');
  const [error, setError] = useState<string | null>(null);
  const [prevFieldId, setPrevFieldId] = useState(fieldId);

  if (fieldId !== prevFieldId) {
    setMinStr(min?.toString() ?? '');
    setMaxStr(max?.toString() ?? '');
    setError(null);
    setPrevFieldId(fieldId);
  }

  const commit = () => {
    const nextMin = minStr.trim() === '' ? undefined : Number(minStr);
    const nextMax = maxStr.trim() === '' ? undefined : Number(maxStr);
    if (nextMin !== undefined && nextMax !== undefined && nextMin >= nextMax) {
      setError('Min must be less than max');
      return;
    }
    setError(null);
    onUpdate(fieldId, { min: nextMin, max: nextMax } as Partial<FormField>);
  };

  return (
    <PanelSection label="Value range">
      <div className="flex gap-2">
        <Input
          id={`${fieldId}-min`}
          label="Min"
          type="number"
          placeholder="No minimum"
          value={minStr}
          onChange={(e) => setMinStr(e.target.value)}
          onBlur={commit}
        />
        <Input
          id={`${fieldId}-max`}
          label="Max"
          type="number"
          placeholder="No maximum"
          value={maxStr}
          onChange={(e) => setMaxStr(e.target.value)}
          onBlur={commit}
        />
      </div>
      {error && <p className="text-caption text-error font-semibold">{error}</p>}
    </PanelSection>
  );
}

// ─── Date field: minDate/maxDate (commits on change — discrete picks) ─────────

function DateRangeSection({
  fieldId,
  minDate,
  maxDate,
  onUpdate,
}: {
  fieldId: string;
  minDate?: string;
  maxDate?: string;
  onUpdate: (fieldId: string, updates: Partial<FormField>) => void;
}) {
  return (
    <PanelSection label="Date range">
      <div className="grid grid-cols-1 min-[881px]:grid-cols-2 gap-2">
        <Input
          id={`${fieldId}-mindate`}
          label="From"
          type="date"
          lang="en-GB"
          value={minDate ?? ''}
          onChange={(e) => onUpdate(fieldId, { minDate: e.target.value || undefined })}
        />
        <Input
          id={`${fieldId}-maxdate`}
          label="To"
          type="date"
          lang="en-GB"
          value={maxDate ?? ''}
          onChange={(e) => onUpdate(fieldId, { maxDate: e.target.value || undefined })}
        />
      </div>
    </PanelSection>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface FieldInlineEditorProps {
  field: FormField;
  onUpdate: (fieldId: string, updates: Partial<FormField>) => void;
  onUpdateOptions: (fieldId: string, options: string[]) => void;
}

// ─── Main Component ───────────────────────────────────────────────────────────
// Rendered inline inside the selected FieldCard on the canvas — replaces the old
// right-side PropertiesPanel. Only ever mounted when its field is selected, so
// there is no "no field selected" empty state to handle here.

export function FieldInlineEditor({ field, onUpdate, onUpdateOptions }: FieldInlineEditorProps) {
  // Field identity is stable and unique across the form, so it doubles as the id prefix.
  const uid = field.fieldId;
  const isTextField = TEXT_TYPES.has(field.type);
  const isChoiceField = field.type === 'dropdown' || field.type === 'multiple_choice' || field.type === 'checkbox';

  return (
    <div className="flex flex-col gap-4">
      {isTextField && (
        <>
          <div className="grid grid-cols-1 min-[881px]:grid-cols-2 gap-4">
            <LabelField uid={uid} fieldId={field.fieldId} label={field.label} onUpdate={onUpdate} />

            <PanelSection label="Placeholder text">
              <BlurField
                id={`${uid}-placeholder`}
                label=""
                defaultValue={field.placeholder ?? ''}
                placeholder="Hint shown inside the field"
                allowEmpty={true}
                onCommit={(v) => onUpdate(field.fieldId, { placeholder: v })}
              />
            </PanelSection>
          </div>

          <HelpTextField uid={uid} fieldId={field.fieldId} helpText={field.helpText ?? ''} onUpdate={onUpdate} />

          <RequiredToggle uid={uid} fieldId={field.fieldId} required={field.required} onUpdate={onUpdate} />

          {field.type === 'number' && (
            <NumberRangeSection fieldId={field.fieldId} min={field.min} max={field.max} onUpdate={onUpdate} />
          )}

          {(field.type === 'short_text' || field.type === 'long_text') && (
            <PanelSection label="Max length">
              <BlurField
                id={`${uid}-maxlength`}
                label=""
                type="number"
                min={1}
                defaultValue={field.maxLength?.toString() ?? ''}
                placeholder="No limit"
                allowEmpty={true}
                onCommit={(v) => {
                  const n = v.trim() === '' ? undefined : Math.max(1, Math.trunc(Number(v)));
                  onUpdate(field.fieldId, { maxLength: n });
                }}
              />
            </PanelSection>
          )}

          {field.type === 'date' && (
            <DateRangeSection fieldId={field.fieldId} minDate={field.minDate} maxDate={field.maxDate} onUpdate={onUpdate} />
          )}
        </>
      )}

      {isChoiceField && (
        <>
          <LabelField uid={uid} fieldId={field.fieldId} label={field.label} onUpdate={onUpdate} />

          <HelpTextField uid={uid} fieldId={field.fieldId} helpText={field.helpText ?? ''} onUpdate={onUpdate} />

          <RequiredToggle uid={uid} fieldId={field.fieldId} required={field.required} onUpdate={onUpdate} />

          <PanelSection label="Options">
            <OptionsEditor fieldId={field.fieldId} options={field.options} onUpdate={onUpdateOptions} />
          </PanelSection>
        </>
      )}

      {field.type === 'file_upload' && (
        <>
          <LabelField uid={uid} fieldId={field.fieldId} label={field.label} onUpdate={onUpdate} />

          <HelpTextField uid={uid} fieldId={field.fieldId} helpText={field.helpText ?? ''} onUpdate={onUpdate} />

          <RequiredToggle uid={uid} fieldId={field.fieldId} required={field.required} onUpdate={onUpdate} />

          <PanelSection label="Allowed file types">
            <div className="flex flex-wrap gap-1.5">
              {ALLOWED_FILE_TYPE_LABELS.map((label) => (
                <span
                  key={label}
                  className="text-caption font-medium text-neutral-600 bg-neutral-100 rounded px-2 py-1"
                >
                  {label}
                </span>
              ))}
            </div>
            <p className="text-caption text-neutral-500 mt-1">
              Platform-enforced — cannot be changed.
            </p>
          </PanelSection>

          <PanelSection label="Max file size">
            <p className="text-body-sm text-neutral-600">100 MB maximum file size</p>
          </PanelSection>
        </>
      )}
    </div>
  );
}
