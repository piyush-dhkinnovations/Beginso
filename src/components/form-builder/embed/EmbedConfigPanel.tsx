'use client';

import { Plus, Trash2 } from 'lucide-react';
import type { FormField } from '@/types/form';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Radio } from '@/components/ui/Radio';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { Tooltip } from '@/components/ui/Tooltip';
import { EMBED_METHODS, LIMITS, type EmbedConfig, type EmbedMethod } from '@/lib/embed/buildEmbedSnippet';
import { checkPrefillRow } from '@/lib/embed/prefill';

interface Props {
  config: EmbedConfig;
  onChange: (patch: Partial<EmbedConfig>) => void;
  fields: FormField[];
}

function SwitchRow({ id, label, hint, checked, onChange, disabled }: { id: string; label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <label htmlFor={id} className="min-w-0">
        <span className="bg-body-sm font-medium text-(--text-secondary)">{label}</span>
        {hint && <span className="block bg-caption text-(--text-muted)">{hint}</span>}
      </label>
      <Switch id={id} checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

function NumberField({ id, label, value, range, suffix, onChange }: { id: string; label: string; value: number; range: readonly number[]; suffix: string; onChange: (n: number) => void }) {
  return (
    <Input
      id={id}
      label={label}
      type="number"
      inputMode="numeric"
      min={range[0]}
      max={range[1]}
      value={Number.isFinite(value) ? value : ''}
      onChange={(e) => onChange(e.target.valueAsNumber)}
      onBlur={() => onChange(Math.min(range[1], Math.max(range[0], Number.isFinite(value) ? Math.round(value) : range[0])))}
      rightSlot={<span className="bg-body-sm text-(--text-muted)">{suffix}</span>}
    />
  );
}

export function EmbedConfigPanel({ config: c, onChange, fields }: Props) {
  const inline = c.method === 'fixed' || c.method === 'auto';
  const button = c.method === 'popup' || c.method === 'drawer';
  const shared = c.method !== 'link';
  const widthRange = c.widthUnit === '%' ? LIMITS.widthPct : LIMITS.widthPx;
  const liveFields = fields.filter((f) => !f.deleted && f.type !== 'file_upload');

  const setRow = (id: string, patch: Partial<{ key: string; value: string }>) => onChange({ prefill: c.prefill.map((r) => (r.id === id ? { ...r, ...patch } : r)) });

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3">
        <h3 className="bg-h5 font-semibold" id="embed-method-label">1. Choose how to embed</h3>
        <div role="radiogroup" aria-labelledby="embed-method-label" className="flex flex-col gap-2">
          {EMBED_METHODS.map((m) => (
            <label key={m.id} className="bg-choice-card" htmlFor={`embed-method-${m.id}`}>
              <Radio id={`embed-method-${m.id}`} name="embed-method" checked={c.method === m.id} onChange={() => onChange({ method: m.id as EmbedMethod })} />
              <span className="min-w-0">
                <strong>{m.name}</strong>
                <small>{m.summary}</small>
                <small>{m.whenToUse}</small>
              </span>
            </label>
          ))}
        </div>
      </Card>

      <Card className="flex flex-col gap-4">
        <h3 className="bg-h5 font-semibold">2. Configure it</h3>

        {inline && (
          <>
            <div className="grid grid-cols-[1fr_auto] items-end gap-2">
              <NumberField id="embed-width" label="Width" value={c.widthValue} range={widthRange} suffix={c.widthUnit} onChange={(n) => onChange({ widthValue: n })} />
              <Select id="embed-width-unit" aria-label="Width unit" value={c.widthUnit} onChange={(e) => onChange({ widthUnit: e.target.value as 'px' | '%', widthValue: e.target.value === '%' ? 100 : 640 })}>
                <option value="%">%</option>
                <option value="px">px</option>
              </Select>
            </div>
            <p className="bg-caption text-(--text-muted) -mt-2">
              {widthRange[0]} to {widthRange[1]} {c.widthUnit}. Never wider than the page that holds it.
            </p>
          </>
        )}
        {c.method === 'fixed' && (
          <>
            <NumberField id="embed-height" label="Height" value={c.height} range={LIMITS.height} suffix="px" onChange={(n) => onChange({ height: n })} />
            <p className="bg-caption text-(--text-muted) -mt-2">
              {LIMITS.height[0]} to {LIMITS.height[1]} px.
            </p>
          </>
        )}
        {inline && (
          <>
            <SwitchRow id="embed-border" label="Border" checked={c.border} onChange={(v) => onChange({ border: v })} />
            <SwitchRow id="embed-rounded" label="Rounded corners" checked={c.rounded} onChange={(v) => onChange({ rounded: v })} />
          </>
        )}

        {button && (
          <>
            <Input id="embed-button-text" label="Button text" value={c.buttonText} maxLength={LIMITS.buttonText} onChange={(e) => onChange({ buttonText: e.target.value })} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-field">
                <label htmlFor="embed-button-color" className="bg-label">Button colour</label>
                <div className="flex items-center gap-2">
                  <input
                    id="embed-button-color"
                    type="color"
                    value={/^#[0-9a-fA-F]{6}$/.test(c.buttonColor) ? c.buttonColor : '#1D4ED8'}
                    onChange={(e) => onChange({ buttonColor: e.target.value.toUpperCase() })}
                    className="h-11 w-14 cursor-pointer rounded-md border border-(--border-default) bg-(--surface-card) p-1"
                  />
                  <span className="bg-body-sm font-mono text-(--text-muted)">{c.buttonColor}</span>
                </div>
              </div>
              <Select id="embed-button-size" label="Button size" value={c.buttonSize} onChange={(e) => onChange({ buttonSize: e.target.value as EmbedConfig['buttonSize'] })}>
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </Select>
            </div>
            {c.method === 'popup' ? (
              <NumberField id="embed-modal-width" label="Modal width" value={c.modalWidth} range={LIMITS.modal} suffix="px" onChange={(n) => onChange({ modalWidth: n })} />
            ) : (
              <>
                <Select id="embed-side" label="Opens from" value={c.side} onChange={(e) => onChange({ side: e.target.value as 'left' | 'right' })}>
                  <option value="right">Right edge</option>
                  <option value="left">Left edge</option>
                </Select>
                <NumberField id="embed-drawer-width" label="Drawer width" value={c.drawerWidth} range={LIMITS.drawer} suffix="px" onChange={(n) => onChange({ drawerWidth: n })} />
              </>
            )}
          </>
        )}

        {c.method === 'link' && (
          <p className="bg-body-sm text-(--text-muted)">
            Nothing to configure. The link, copy button and QR code are in <strong>Public link</strong> above, and the address is shown on the right.
          </p>
        )}
      </Card>

      {shared && (
        <Card className="flex flex-col gap-4">
          <h3 className="bg-h5 font-semibold">3. Options for every embed</h3>
          <SwitchRow id="embed-cover" label="Show cover" hint="The banner and logo above the form." checked={c.cover} onChange={(v) => onChange({ cover: v })} />
          <SwitchRow id="embed-progress" label="Show progress" hint="Page progress, steps and the question counter." checked={c.progress} onChange={(v) => onChange({ progress: v })} />
          <SwitchRow id="embed-hide-title" label="Hide form title" hint="Hidden visually, still read by screen readers." checked={c.hideTitle} onChange={(v) => onChange({ hideTitle: v })} />
          <div className="flex items-start justify-between gap-3">
            <label htmlFor="embed-branding" className="min-w-0">
              <span className="bg-body-sm font-medium text-(--text-secondary)">Hide Beginso branding</span>
              <span className="block bg-caption text-(--text-muted)">Not available yet. Embedded forms do not show Beginso branding today, and there is no plan setting to unlock it, so this option is off and adds nothing to the code.</span>
            </label>
            <Tooltip content="Not available yet">
              <Switch id="embed-branding" checked={false} onChange={() => {}} disabled />
            </Tooltip>
          </div>
          <Select id="embed-theme" label="Theme" value={c.theme} onChange={(e) => onChange({ theme: e.target.value as EmbedConfig['theme'] })}>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="auto">Auto (follow the page it is embedded in)</option>
          </Select>
          <p className="bg-caption text-(--text-muted) -mt-2">
            Auto follows your website, not Beginso. With the script (auto-height, popup, drawer) it uses your page&apos;s colour scheme; in a plain iframe it uses the visitor&apos;s browser setting, which only matches a site that does not force its own scheme.
          </p>

          <fieldset className="flex flex-col gap-2 border-0 p-0 m-0 min-w-0">
            <legend className="bg-label">Pre-fill fields</legend>
            <p className="bg-caption text-(--text-muted)">Fill a field from the link, e.g. a logged-in visitor&apos;s email. Use a field&apos;s label or id. Pre-filled forms are never submitted automatically.</p>
            <datalist id="embed-prefill-keys">
              {liveFields.map((f) => (
                <option key={f.fieldId} value={f.label} />
              ))}
            </datalist>
            {c.prefill.map((r, i) => {
              const check = checkPrefillRow(fields, r.key, r.value);
              return (
                <div key={r.id} className="grid grid-cols-[1fr_1fr_auto] items-start gap-2">
                  <Input id={`embed-prefill-key-${r.id}`} aria-label={`Pre-fill field ${i + 1}`} placeholder="Field label or id" list="embed-prefill-keys" value={r.key} onChange={(e) => setRow(r.id, { key: e.target.value })} error={r.key.trim() && check.error && !check.fieldLabel ? check.error : undefined} />
                  <Input id={`embed-prefill-value-${r.id}`} aria-label={`Pre-fill value ${i + 1}`} placeholder="Value" value={r.value} onChange={(e) => setRow(r.id, { value: e.target.value })} error={check.fieldLabel && check.error ? check.error : undefined} />
                  <Button type="button" variant="ghost" aria-label={`Remove pre-fill ${i + 1}`} onClick={() => onChange({ prefill: c.prefill.filter((x) => x.id !== r.id) })} className="min-h-11">
                    <Trash2 size={16} aria-hidden="true" />
                  </Button>
                </div>
              );
            })}
            <Button
              type="button"
              variant="secondary"
              size="small"
              className="self-start"
              disabled={c.prefill.length >= LIMITS.prefillRows}
              onClick={() => onChange({ prefill: [...c.prefill, { id: crypto.randomUUID(), key: '', value: '' }] })}
            >
              <Plus size={16} aria-hidden="true" /> Add pre-fill
            </Button>
          </fieldset>
        </Card>
      )}
    </div>
  );
}
