'use client';

import React, { useId, useState } from 'react';
import { Settings2 } from 'lucide-react';
import type { FormField } from '@/types/form';
import { Input } from '@/components/ui/Input';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TEXT_TYPES = new Set([
  'short_text',
  'long_text',
  'email',
  'phone',
  'number',
  'date',
]);

// ─── Small sub-component: a labelled section ───────────────────────────────────

function PanelSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
        {label}
      </span>
      {children}
    </div>
  );
}

// ─── Toggle Switch (no shadcn dep) ────────────────────────────────────────────

function Switch({
  id,
  checked,
  onChange,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${checked ? 'bg-brand-600' : 'bg-neutral-300'
        }`}
    >
      <span
        className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? 'translate-x-4' : 'translate-x-0'
          }`}
      />
    </button>
  );
}

// ─── On-blur text field helper ────────────────────────────────────────────────

function BlurField({
  id,
  label,
  defaultValue,
  placeholder,
  allowEmpty = false,
  onCommit,
}: {
  id: string;
  label: string;
  defaultValue: string;
  placeholder?: string;
  allowEmpty?: boolean;
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

// ─── Props ────────────────────────────────────────────────────────────────────

export interface PropertiesPanelProps {
  field: FormField | null;
  onUpdate: (fieldId: string, updates: Partial<FormField>) => void;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PropertiesPanel({ field, onUpdate }: PropertiesPanelProps) {
  const uid = useId();

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (!field) {
    return (
      <aside className="w-[320px] border-l bg-white flex flex-col items-center justify-center p-6 text-center shrink-0 gap-3">
        <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center">
          <Settings2 size={18} className="text-neutral-400" />
        </div>
        <p className="text-body-sm text-neutral-400 max-w-[180px] leading-relaxed">
          Select a field to configure its properties
        </p>
      </aside>
    );
  }

  const isTextField = TEXT_TYPES.has(field.type);
  const isChoiceOrFile =
    field.type === 'dropdown' ||
    field.type === 'multiple_choice' ||
    field.type === 'checkbox' ||
    field.type === 'file_upload';

  return (
    <aside className="w-[320px] border-l bg-white overflow-y-auto shrink-0 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-neutral-50">
        <h3 className="text-heading-3 font-bold text-neutral-800 tracking-tight">
          Field Properties
        </h3>
        <p className="text-caption text-neutral-400 mt-0.5">
          {field.type.replace(/_/g, ' ')}
        </p>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-5 p-4">
        {isTextField && (
          <>
            {/* Label */}
            <PanelSection label="Label">
              <BlurField
                id={`${uid}-label`}
                label=""
                defaultValue={field.label}
                placeholder="Field label"
                onCommit={(v) => onUpdate(field.fieldId, { label: v })}
              />
            </PanelSection>

            {/* Placeholder */}
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

            {/* Help text */}
            <PanelSection label="Help text">
              <BlurField
                id={`${uid}-help`}
                label=""
                defaultValue={field.helpText ?? ''}
                placeholder="Optional helper copy below the field"
                allowEmpty={true}
                onCommit={(v) => onUpdate(field.fieldId, { helpText: v })}
              />
            </PanelSection>

            {/* Required toggle */}
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
                  checked={field.required}
                  onChange={(v) => onUpdate(field.fieldId, { required: v })}
                />
              </div>
            </PanelSection>
          </>
        )}

        {isChoiceOrFile && (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
              <Settings2 size={16} className="text-blue-400" />
            </div>
            <p className="text-body-sm text-neutral-500 max-w-[220px] leading-relaxed">
              Full configuration for this field type is coming in{' '}
              <span className="font-semibold text-neutral-700">Sprint 2 Part 2</span>
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
