'use client';

import React, { useEffect, useState } from 'react';
import type { FormField, ImageAspectRatio, ImagePreviewPosition, ImagePreviewSize, UrlDisplay, UrlPreviewStyle } from '@/types/form';
import { Input } from '@/components/ui/Input';
import { Radio } from '@/components/ui/Radio';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { CURRENCY_OPTIONS, IMAGE_MAX_COUNT_OPTIONS, currencyOf, imageSettings, urlSettings } from '@/lib/fieldDisplay';
import { OptionsEditor } from './OptionsEditor';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TEXT_TYPES = new Set([
  'short_text',
  'long_text',
  'email',
  'phone',
  'number',
  'date',
  'url',
  'currency',
]);

// Types with nothing to configure beyond label, help text and required.
const BASIC_TYPES = new Set(['rating', 'yes_no', 'time', 'datetime', 'address', 'signature']);

// Platform-enforced allowlist — not configurable per-field, so it's a constant, not state.
const ALLOWED_FILE_TYPE_LABELS = ['PDF', 'Word', 'Excel', 'Images', 'Video (MP4)', 'ZIP', 'Plain text'];

// ─── Small sub-component: a labelled section ───────────────────────────────────

export function PanelSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="bg-overline text-(--text-muted)">
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

  // Commit shortly after the last keystroke too, not only on blur — otherwise the store stays
  // clean while typing, the header says "All changes saved" and a reload/hard navigation loses
  // the edit. A cleared required field is left alone until blur (it would revert to default).
  useEffect(() => {
    const trimmed = local.trim();
    if (trimmed === defaultValue || (!allowEmpty && !trimmed)) return;
    const t = setTimeout(() => onCommit(trimmed), 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onCommit identity changes every render
  }, [local, defaultValue, allowEmpty]);

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
          className="bg-body-sm font-medium text-(--text-secondary) cursor-pointer"
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
  const [prevFieldId, setPrevFieldId] = useState(fieldId);

  if (fieldId !== prevFieldId) {
    setMinStr(min?.toString() ?? '');
    setMaxStr(max?.toString() ?? '');
    setPrevFieldId(fieldId);
  }

  const nextMin = minStr.trim() === '' ? undefined : Number(minStr);
  const nextMax = maxStr.trim() === '' ? undefined : Number(maxStr);
  // Live (not on blur): an inverted range makes the form impossible to submit, so it is flagged as typed and never saved.
  const error = nextMin !== undefined && nextMax !== undefined && nextMin > nextMax ? 'Min cannot be greater than max. This range is not saved.' : null;

  const commit = () => {
    if (error) return;
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
      {error && <p role="alert" className="bg-caption text-(--error-text) font-semibold">{error}</p>}
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
  // Local copy so a reversed range can be shown and kept out of the store (the server rejects it with a 400 and the
  // whole form then fails to save). Re-seeded when the stored value changes from outside (undo, another field).
  const [from, setFrom] = useState(minDate ?? '');
  const [to, setTo] = useState(maxDate ?? '');
  const [prev, setPrev] = useState({ fieldId, minDate, maxDate });
  if (prev.fieldId !== fieldId || prev.minDate !== minDate || prev.maxDate !== maxDate) {
    setFrom(minDate ?? '');
    setTo(maxDate ?? '');
    setPrev({ fieldId, minDate, maxDate });
  }
  // ISO dates compare correctly as strings.
  const error = from && to && from > to ? 'From cannot be after To. This range is not saved.' : null;

  // Only the key that changed is sent, and only while the range is valid.
  const change = (key: 'minDate' | 'maxDate', value: string) => {
    const nextFrom = key === 'minDate' ? value : from;
    const nextTo = key === 'maxDate' ? value : to;
    setFrom(nextFrom);
    setTo(nextTo);
    if (nextFrom && nextTo && nextFrom > nextTo) return;
    onUpdate(fieldId, { [key]: value || undefined } as Partial<FormField>);
  };

  return (
    <PanelSection label="Date range">
      <div className="grid grid-cols-1 min-[881px]:grid-cols-2 gap-2">
        <Input
          id={`${fieldId}-mindate`}
          label="From"
          type="date"
          lang="en-GB"
          value={from}
          onChange={(e) => change('minDate', e.target.value)}
          error={error ?? undefined}
        />
        <Input
          id={`${fieldId}-maxdate`}
          label="To"
          type="date"
          lang="en-GB"
          value={to}
          onChange={(e) => change('maxDate', e.target.value)}
        />
      </div>
    </PanelSection>
  );
}

// ─── Display & Preview (Image Upload / Website URL) ───────────────────────────
// These preferences are saved on the field, and the response viewer reads them from there — so every
// response to this form (old and new) is laid out the same way.

function RadioSection<T extends string>({
  uid,
  name,
  label,
  value,
  options,
  onChange,
}: {
  uid: string;
  name: string;
  label: string;
  value: T;
  options: { value: T; label: string; description?: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <PanelSection label={label}>
      <div role="radiogroup" aria-label={label} className="flex flex-col gap-1">
        {options.map((o) => (
          <Radio
            key={o.value}
            id={`${uid}-${name}-${o.value}`}
            name={`${uid}-${name}`}
            label={o.label}
            description={o.description}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
          />
        ))}
      </div>
    </PanelSection>
  );
}

function ConfigSummary({ text }: { text: string }) {
  return (
    <div className="rounded-md bg-(--bg-subtle) px-3 py-2">
      <span className="bg-overline text-(--text-muted)">Configuration summary</span>
      <p className="mt-0.5 bg-body-sm text-(--text-secondary)">{text}</p>
    </div>
  );
}

const POSITION_LABEL: Record<ImagePreviewPosition, string> = { top: 'Top of response', inline: 'Inline with the answer' };
const RATIO_LABEL: Record<ImageAspectRatio, string> = { original: 'original ratio', '16:9': '16:9 landscape', '1:1': '1:1 square' };
const SIZE_LABEL: Record<ImagePreviewSize, string> = { small: 'small thumbnail', medium: 'medium', large: 'large preview' };
const STYLE_LABEL: Record<UrlPreviewStyle, string> = { rich: 'rich preview', compact: 'compact link', text: 'URL text only' };
const DISPLAY_LABEL: Record<UrlDisplay, string> = { card: 'displayed as card', inline: 'inline with the answer' };

function ImageDisplaySection({
  field,
  onUpdate,
}: {
  field: Extract<FormField, { type: 'image_upload' }>;
  onUpdate: (fieldId: string, updates: Partial<FormField>) => void;
}) {
  const uid = field.fieldId;
  const s = imageSettings(field);
  const set = (updates: Partial<Extract<FormField, { type: 'image_upload' }>>) => onUpdate(uid, updates as Partial<FormField>);

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-(--border-default) p-4">
      <div>
        <h4 className="bg-body font-semibold text-(--text-primary)">Display &amp; Preview</h4>
        <p className="bg-caption text-(--text-muted)">How uploaded images appear in each response.</p>
      </div>

      <RadioSection<ImagePreviewPosition>
        uid={uid}
        name="position"
        label="Preview position"
        value={s.previewPosition}
        options={[
          { value: 'top', label: 'Top of response (recommended)' },
          { value: 'inline', label: 'Inline with the answer' },
        ]}
        onChange={(previewPosition) => set({ previewPosition })}
      />
      <RadioSection<ImageAspectRatio>
        uid={uid}
        name="ratio"
        label="Image aspect ratio"
        value={s.aspectRatio}
        options={[
          { value: 'original', label: 'Original ratio' },
          { value: '16:9', label: '16:9 landscape' },
          { value: '1:1', label: '1:1 square' },
        ]}
        onChange={(aspectRatio) => set({ aspectRatio })}
      />
      <RadioSection<ImagePreviewSize>
        uid={uid}
        name="size"
        label="Preview size"
        value={s.previewSize}
        options={[
          { value: 'small', label: 'Small thumbnail' },
          { value: 'medium', label: 'Medium' },
          { value: 'large', label: 'Large preview' },
        ]}
        onChange={(previewSize) => set({ previewSize })}
      />

      <PanelSection label="Uploads">
        <div className="flex items-center justify-between py-1">
          <label htmlFor={`${uid}-multiple`} className="bg-body-sm font-medium text-(--text-secondary) cursor-pointer">
            Allow multiple images
          </label>
          <Switch id={`${uid}-multiple`} checked={s.allowMultiple} onChange={(allowMultiple) => set({ allowMultiple })} />
        </div>
        {s.allowMultiple && (
          <Select
            id={`${uid}-max-images`}
            label="Maximum images"
            value={String(s.maxImages)}
            onChange={(e) => set({ maxImages: Number(e.target.value) })}
          >
            {IMAGE_MAX_COUNT_OPTIONS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </Select>
        )}
        <p className="bg-caption text-(--text-muted)">JPG, PNG or WebP · up to {s.maxSizeMb} MB each.</p>
      </PanelSection>

      <ConfigSummary
        text={`Images: ${POSITION_LABEL[s.previewPosition]}, ${RATIO_LABEL[s.aspectRatio]}, ${SIZE_LABEL[s.previewSize]}, up to ${s.maxImages} image${s.maxImages === 1 ? '' : 's'}.`}
      />
    </div>
  );
}

function UrlDisplaySection({
  field,
  onUpdate,
}: {
  field: Extract<FormField, { type: 'url' }>;
  onUpdate: (fieldId: string, updates: Partial<FormField>) => void;
}) {
  const uid = field.fieldId;
  const s = urlSettings(field);
  const set = (updates: Partial<Extract<FormField, { type: 'url' }>>) => onUpdate(uid, updates as Partial<FormField>);

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-(--border-default) p-4">
      <div>
        <h4 className="bg-body font-semibold text-(--text-primary)">Display &amp; Preview</h4>
        <p className="bg-caption text-(--text-muted)">How a submitted link appears in each response. Websites are never embedded.</p>
      </div>

      <RadioSection<UrlPreviewStyle>
        uid={uid}
        name="style"
        label="Preview style"
        value={s.style}
        options={[
          { value: 'rich', label: 'Rich preview', description: 'Title, domain and thumbnail when available' },
          { value: 'compact', label: 'Compact link', description: 'Favicon-style badge and domain' },
          { value: 'text', label: 'URL text only' },
        ]}
        onChange={(urlPreviewStyle) => set({ urlPreviewStyle })}
      />
      <RadioSection<UrlDisplay>
        uid={uid}
        name="display"
        label="Response display"
        value={s.display}
        options={[
          { value: 'card', label: 'Preview card' },
          { value: 'inline', label: 'Inline with the answer' },
        ]}
        onChange={(urlDisplay) => set({ urlDisplay })}
      />

      <ConfigSummary text={`Links: ${STYLE_LABEL[s.style]}, ${DISPLAY_LABEL[s.display]}.`} />
    </div>
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

          {(field.type === 'number' || field.type === 'currency') && (
            <NumberRangeSection fieldId={field.fieldId} min={field.min} max={field.max} onUpdate={onUpdate} />
          )}

          {field.type === 'currency' && (
            <PanelSection label="Currency">
              <Select
                id={`${uid}-currency`}
                aria-label="Currency"
                value={currencyOf(field)}
                onChange={(e) => onUpdate(field.fieldId, { currency: e.target.value } as Partial<FormField>)}
              >
                {CURRENCY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </Select>
            </PanelSection>
          )}

          {field.type === 'url' && <UrlDisplaySection field={field} onUpdate={onUpdate} />}

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

      {BASIC_TYPES.has(field.type) && (
        <>
          <LabelField uid={uid} fieldId={field.fieldId} label={field.label} onUpdate={onUpdate} />

          <HelpTextField uid={uid} fieldId={field.fieldId} helpText={field.helpText ?? ''} onUpdate={onUpdate} />

          <RequiredToggle uid={uid} fieldId={field.fieldId} required={field.required} onUpdate={onUpdate} />
        </>
      )}

      {field.type === 'image_upload' && (
        <>
          <LabelField uid={uid} fieldId={field.fieldId} label={field.label} onUpdate={onUpdate} />

          <HelpTextField uid={uid} fieldId={field.fieldId} helpText={field.helpText ?? ''} onUpdate={onUpdate} />

          <RequiredToggle uid={uid} fieldId={field.fieldId} required={field.required} onUpdate={onUpdate} />

          <ImageDisplaySection field={field} onUpdate={onUpdate} />
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
                  className="bg-caption font-medium text-(--text-secondary) bg-(--bg-sunken) rounded px-2 py-1"
                >
                  {label}
                </span>
              ))}
            </div>
            <p className="bg-caption text-(--text-muted) mt-1">
              Platform-enforced — cannot be changed.
            </p>
          </PanelSection>

          <PanelSection label="Max file size">
            <p className="bg-body-sm text-(--text-secondary)">25 MB maximum file size</p>
          </PanelSection>
        </>
      )}
    </div>
  );
}
