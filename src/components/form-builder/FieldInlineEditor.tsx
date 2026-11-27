'use client';

import React, { useEffect, useRef, useState } from 'react';
import { setPendingEdit } from '@/lib/pendingEdits';
import type { FormField, ImageAspectRatio, ImagePreviewPosition, ImagePreviewSize, UrlDisplay, UrlPreviewStyle } from '@/types/form';
import { Input } from '@/components/ui/Input';
import { SegmentedRadio } from '@/components/ui/SegmentedRadio';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { ChevronDown } from 'lucide-react';
import { CURRENCY_OPTIONS, MAX_IMAGES_PER_FIELD, currencyOf, imageSettings, urlSettings } from '@/lib/fieldDisplay';
import { OptionsEditor } from './OptionsEditor';

// Helpers

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
const BASIC_TYPES = new Set(['rating', 'time', 'datetime', 'address', 'signature']);

// Platform-enforced allowlist — not configurable per-field, so it's a constant, not state.
const ALLOWED_FILE_TYPE_LABELS = ['PDF', 'Word', 'Excel', 'Images', 'Video (MP4)', 'ZIP', 'Plain text'];

// Small sub-component: a labelled section

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

// On-blur text field helper

function BlurField({
  id,
  label,
  defaultValue,
  placeholder,
  allowEmpty = false,
  type = 'text',
  min,
  maxLength,
  onCommit,
}: {
  id: string;
  label: string;
  defaultValue: string;
  placeholder?: string;
  allowEmpty?: boolean;
  type?: string;
  min?: number;
  maxLength?: number;
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

  // Typed but not yet committed: tell the builder, so the header says "Unsaved changes", the leave prompt is armed, and a
  // page-hide can commit it first (QA D3-001). A cleared required field is not an edit (it reverts on blur).
  const latest = useRef({ local, defaultValue, allowEmpty, onCommit });
  useEffect(() => {
    latest.current = { local, defaultValue, allowEmpty, onCommit };
  });
  const pendingKey = `blur:${id}`;
  const typed = local.trim() !== defaultValue && (allowEmpty || !!local.trim());
  useEffect(() => {
    if (!typed) {
      setPendingEdit(pendingKey, null);
      return;
    }
    setPendingEdit(pendingKey, { flush: () => latest.current.onCommit(latest.current.local.trim()) });
  }, [typed, pendingKey]);
  useEffect(() => () => setPendingEdit(pendingKey, null), [pendingKey]);

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
      maxLength={maxLength}
      showCount
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

// Shared property sections (label / help text / required — reused across field-type branches)

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
        maxLength={100} // the server refuses a longer label
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

// Number field: min/max range (cross-field validation on blur)

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

// Date field: minDate/maxDate (commits on change — discrete picks)

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

// Display & Preview (Image Upload / Website URL)
// These preferences are saved on the field, and the response viewer reads them from there — so every
// response to this form (old and new) is laid out the same way.

// One setting on one line: its name, then the choices side by side.
function ChoiceRow<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; title?: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
      <span aria-hidden="true" className="bg-body-sm text-(--text-secondary) sm:w-24 sm:shrink-0">{label}</span>
      <SegmentedRadio
        ariaLabel={label}
        value={value}
        onChange={(id) => onChange(id as T)}
        options={options.map((o) => ({ id: o.value, label: o.label, title: o.title }))}
        className="max-w-full flex-wrap self-start"
      />
    </div>
  );
}

/** Closed until asked for: most owners keep the defaults, and the line under the title says what is set. */
function DisplayOptions({ title, summary, children }: { title: string; summary: string; children: React.ReactNode }) {
  return (
    <details className="group/display rounded-lg border border-(--border-default)">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-lg px-3 py-2 hover:bg-(--surface-hover) [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="bg-body-sm font-semibold text-(--text-primary)">{title}</span>
          <span className="truncate bg-caption text-(--text-muted)">{summary}</span>
        </span>
        <ChevronDown size={16} aria-hidden="true" className="shrink-0 text-(--text-muted) transition-transform group-open/display:rotate-180" />
      </summary>
      <div className="flex flex-col gap-3 border-t border-(--border-default) p-3">{children}</div>
    </details>
  );
}

const POSITIONS: { value: ImagePreviewPosition; label: string; title: string }[] = [
  { value: 'top', label: 'At the top', title: 'Above the other answers' },
  { value: 'inline', label: 'With the answer', title: 'In its place among the answers' },
];
const RATIOS: { value: ImageAspectRatio; label: string; title: string }[] = [
  { value: 'original', label: 'Original', title: 'The picture as uploaded' },
  { value: '16:9', label: 'Wide', title: '16:9 landscape' },
  { value: '1:1', label: 'Square', title: '1:1 square' },
];
const SIZES: { value: ImagePreviewSize; label: string }[] = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
];
const STYLES: { value: UrlPreviewStyle; label: string; title: string }[] = [
  { value: 'rich', label: 'Preview card', title: 'Title, domain and thumbnail when available' },
  { value: 'compact', label: 'Short link', title: 'A small badge and the domain' },
  { value: 'text', label: 'Plain text', title: 'The address as typed' },
];
const FRAMES: { value: UrlDisplay; label: string }[] = [
  { value: 'card', label: 'Border' },
  { value: 'inline', label: 'No border' },
];

const nameOf = <T extends string>(options: { value: T; label: string }[], value: T) => options.find((o) => o.value === value)?.label ?? value;

function ImageDisplaySection({
  field,
  onUpdate,
}: {
  field: Extract<FormField, { type: 'image_upload' }>;
  onUpdate: (fieldId: string, updates: Partial<FormField>) => void;
}) {
  const s = imageSettings(field);
  const set = (updates: Partial<Extract<FormField, { type: 'image_upload' }>>) => onUpdate(field.fieldId, updates as Partial<FormField>);

  return (
    <DisplayOptions
      title="How images look in responses"
      summary={[nameOf(POSITIONS, s.previewPosition), `${nameOf(RATIOS, s.aspectRatio)} shape`, `${nameOf(SIZES, s.previewSize)} size`].join(' · ')}
    >
      <ChoiceRow label="Position" value={s.previewPosition} options={POSITIONS} onChange={(previewPosition) => set({ previewPosition })} />
      <ChoiceRow label="Shape" value={s.aspectRatio} options={RATIOS} onChange={(aspectRatio) => set({ aspectRatio })} />
      <ChoiceRow label="Size" value={s.previewSize} options={SIZES} onChange={(previewSize) => set({ previewSize })} />
    </DisplayOptions>
  );
}

function ImageLimitSection({
  field,
  onUpdate,
}: {
  field: Extract<FormField, { type: 'image_upload' }>;
  onUpdate: (fieldId: string, updates: Partial<FormField>) => void;
}) {
  const uid = field.fieldId;
  const s = imageSettings(field);
  const [maxImagesInput, setMaxImagesInput] = useState(String(s.maxImages));

  return (
    <div className="flex flex-col gap-1.5">
      <div className="max-w-48">
        <Input
          id={`${uid}-max-images`}
          label="Maximum images"
          type="number"
          min={1}
          max={MAX_IMAGES_PER_FIELD}
          step={1}
          value={maxImagesInput}
          onChange={(e) => setMaxImagesInput(e.target.value)}
          onBlur={() => {
            const entered = Number(maxImagesInput);
            const maxImages = Number.isFinite(entered)
              ? Math.min(MAX_IMAGES_PER_FIELD, Math.max(1, Math.floor(entered)))
              : s.maxImages;
            setMaxImagesInput(String(maxImages));
            onUpdate(uid, { allowMultiple: maxImages > 1, maxImages: maxImages > 1 ? maxImages : undefined } as Partial<FormField>);
          }}
        />
      </div>
      <p className="bg-caption text-(--text-muted)">JPG, PNG or WebP · up to {s.maxSizeMb} MB each.</p>
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
  const s = urlSettings(field);
  const set = (updates: Partial<Extract<FormField, { type: 'url' }>>) => onUpdate(field.fieldId, updates as Partial<FormField>);
  const rich = s.style === 'rich';

  return (
    <DisplayOptions
      title="How links look in responses"
      summary={[nameOf(STYLES, s.style), nameOf(POSITIONS, s.previewPosition), ...(rich ? [`${nameOf(RATIOS, s.aspectRatio)} shape`, `${nameOf(SIZES, s.previewSize)} size`] : []), nameOf(FRAMES, s.display)].join(' · ')}
    >
      <ChoiceRow label="Style" value={s.style} options={STYLES} onChange={(urlPreviewStyle) => set({ urlPreviewStyle })} />
      <ChoiceRow label="Position" value={s.previewPosition} options={POSITIONS} onChange={(urlPreviewPosition) => set({ urlPreviewPosition })} />
      {rich && (
        <>
          <ChoiceRow label="Shape" value={s.aspectRatio} options={RATIOS} onChange={(urlAspectRatio) => set({ urlAspectRatio })} />
          <ChoiceRow label="Size" value={s.previewSize} options={SIZES} onChange={(urlPreviewSize) => set({ urlPreviewSize })} />
        </>
      )}
      <ChoiceRow label="Frame" value={s.display} options={FRAMES} onChange={(urlDisplay) => set({ urlDisplay })} />
      <p className="bg-caption text-(--text-muted)">Websites are never embedded.</p>
    </DisplayOptions>
  );
}

// Props

export interface FieldInlineEditorProps {
  field: FormField;
  onUpdate: (fieldId: string, updates: Partial<FormField>) => void;
  onUpdateOptions: (fieldId: string, options: string[]) => void;
  /** One tab of an open field card. Unset shows every setting, with the Required switch. */
  section?: 'content' | 'validation';
}

// Main Component
// Rendered inline inside the selected FieldCard on the canvas.
// Only ever mounted when its field is selected, so
// there is no "no field selected" empty state to handle here.

export function FieldInlineEditor({ field, onUpdate, onUpdateOptions, section }: FieldInlineEditorProps) {
  // Field identity is stable and unique across the form, so it doubles as the id prefix.
  const uid = field.fieldId;
  const isTextField = TEXT_TYPES.has(field.type);
  const isChoiceField = field.type === 'dropdown' || field.type === 'multiple_choice' || field.type === 'checkbox';
  const content = section !== 'validation';
  const validation = section !== 'content';
  const common = content && (
    <>
      <LabelField uid={uid} fieldId={field.fieldId} label={field.label} onUpdate={onUpdate} />
      <HelpTextField uid={uid} fieldId={field.fieldId} helpText={field.helpText ?? ''} onUpdate={onUpdate} />
    </>
  );
  // In a field card the Required switch sits beside the tabs instead.
  const required = section === undefined && <RequiredToggle uid={uid} fieldId={field.fieldId} required={field.required} onUpdate={onUpdate} />;

  return (
    <div className="flex flex-col gap-4">
      {isTextField && (
        <>
          {content && (
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
            </>
          )}

          {required}

          {validation && (field.type === 'number' || field.type === 'currency') && (
            <NumberRangeSection fieldId={field.fieldId} min={field.min} max={field.max} onUpdate={onUpdate} />
          )}

          {content && field.type === 'currency' && (
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

          {content && field.type === 'url' && <UrlDisplaySection field={field} onUpdate={onUpdate} />}

          {validation && (field.type === 'short_text' || field.type === 'long_text') && (
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

          {validation && field.type === 'date' && (
            <DateRangeSection fieldId={field.fieldId} minDate={field.minDate} maxDate={field.maxDate} onUpdate={onUpdate} />
          )}
        </>
      )}

      {isChoiceField && (
        <>
          {common}
          {required}
          {content && (
            <PanelSection label="Options">
              <OptionsEditor fieldId={field.fieldId} options={field.options} onUpdate={onUpdateOptions} />
            </PanelSection>
          )}
        </>
      )}

      {BASIC_TYPES.has(field.type) && (
        <>
          {common}
          {required}
        </>
      )}

      {field.type === 'yes_no' && (
        <>
          {common}
          {required}
          {content && (
            <PanelSection label="Button words">
              <BlurField
                id={`${uid}-yes`}
                label=""
                defaultValue={field.yesLabel ?? ''}
                placeholder="Yes"
                allowEmpty={true}
                maxLength={30}
                onCommit={(v) => onUpdate(field.fieldId, { yesLabel: v || undefined })}
              />
              <BlurField
                id={`${uid}-no`}
                label=""
                defaultValue={field.noLabel ?? ''}
                placeholder="No"
                allowEmpty={true}
                maxLength={30}
                onCommit={(v) => onUpdate(field.fieldId, { noLabel: v || undefined })}
              />
              <p className="bg-caption text-(--text-muted)">Only the words change. Answers and exports still read Yes or No.</p>
            </PanelSection>
          )}
        </>
      )}

      {field.type === 'image_upload' && (
        <>
          {common}
          {required}
          {validation && <ImageLimitSection field={field} onUpdate={onUpdate} />}
          {content && <ImageDisplaySection field={field} onUpdate={onUpdate} />}
        </>
      )}

      {field.type === 'file_upload' && (
        <>
          {common}
          {required}
          {validation && (
            <>
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
        </>
      )}
    </div>
  );
}
