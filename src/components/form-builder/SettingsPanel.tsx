'use client';

import { useState } from 'react';
import { Copy } from 'lucide-react';
import type { FormSettings, FormStatus } from '@/types/form';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { Switch } from '@/components/ui/Switch';
import { PanelCard } from './PanelCard';

const LAYOUT_OPTIONS: { value: NonNullable<FormSettings['layout']>; label: string }[] = [
  { value: 'single_column', label: 'Single Column' },
  { value: 'two_column', label: 'Two Column' },
  { value: 'compact', label: 'Compact' },
];

// Small non-interactive shape preview per layout option — no new icon asset needed.
function LayoutPreview({ value }: { value: NonNullable<FormSettings['layout']> }) {
  if (value === 'two_column') {
    return (
      <div className="flex flex-col gap-1 w-full">
        {[0, 1, 2].map((row) => (
          <div key={row} className="flex gap-1">
            <div className="h-2 flex-1 rounded-sm bg-(--border-strong)" />
            <div className="h-2 flex-1 rounded-sm bg-(--border-strong)" />
          </div>
        ))}
      </div>
    );
  }
  if (value === 'compact') {
    // Label-left rows — distinct from Single Column's label-above stack.
    return (
      <div className="flex flex-col gap-1 w-full">
        {[0, 1, 2].map((row) => (
          <div key={row} className="flex items-center gap-1">
            <div className="h-1.5 w-3 rounded-sm bg-(--text-disabled)" />
            <div className="h-1.5 flex-1 rounded-sm bg-(--border-strong)" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {[0, 1, 2].map((row) => (
        <div key={row} className="h-2 w-full rounded-sm bg-(--border-strong)" />
      ))}
    </div>
  );
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

// <input type="datetime-local"> values are timezone-naive ("2026-07-22T16:17", no offset) —
// the browser and whatever later reads that string (a server, a different user's browser)
// can disagree on what instant it means. Always store closeDate as a real UTC ISO string
// (with the "Z" suffix) so "4:17 PM" means the same moment everywhere, and only convert
// to/from the naive local format at the point the <input> itself needs it.
function localInputToIso(localValue: string): string {
  return new Date(localValue).toISOString();
}
function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export interface SettingsPanelProps {
  settings: FormSettings;
  status: FormStatus;
  slug?: string;
  onUpdate: (updates: Partial<FormSettings>) => void;
}

export function SettingsPanel({ settings, status, slug, onUpdate }: SettingsPanelProps) {
  const { toast } = useToast();

  // ── Success message (commits on blur) ───────────────────────────────────────
  const [message, setMessage] = useState(settings.successMessage ?? '');
  const [prevMessage, setPrevMessage] = useState(settings.successMessage ?? '');
  if ((settings.successMessage ?? '') !== prevMessage) {
    setMessage(settings.successMessage ?? '');
    setPrevMessage(settings.successMessage ?? '');
  }

  // ── Response limit ───────────────────────────────────────────────────────────
  // Bug fixed 22 Jul 2026: the backend enforces this off a separate responseLimitEnabled
  // flag, not off whether responseLimit has a value — this panel used to only ever send
  // responseLimit, so the toggle displayed as "on" while the backend silently never
  // enforced the limit. Falls back to the old inference for forms saved before this fix.
  const limitEnabled = settings.responseLimitEnabled ?? settings.responseLimit !== undefined;
  const [limitStr, setLimitStr] = useState(settings.responseLimit?.toString() ?? '');
  const [prevLimit, setPrevLimit] = useState(settings.responseLimit);
  const [limitError, setLimitError] = useState<string | null>(null);
  if (settings.responseLimit !== prevLimit) {
    setLimitStr(settings.responseLimit?.toString() ?? '');
    setPrevLimit(settings.responseLimit);
    setLimitError(null);
  }

  const commitLimit = () => {
    const n = Number(limitStr.trim());
    if (!Number.isInteger(n) || n < 1) {
      setLimitError('Enter a positive whole number');
      return;
    }
    setLimitError(null);
    onUpdate({ responseLimit: n, responseLimitEnabled: true });
  };

  // ── Close date ────────────────────────────────────────────────────────────────
  const closeDateEnabled = settings.closeDate !== undefined;
  const isPastDate = closeDateEnabled && new Date(settings.closeDate!) < new Date();

  const publicUrl = slug ? `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/f/${slug}` : '';
  const activeLayout = settings.layout ?? 'single_column';

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <div>
        <h2 className="bg-h4 font-bold text-(--text-primary)">Settings</h2>
        <p className="bg-body text-(--text-muted) mt-1">Control how respondents interact with this form.</p>
      </div>

      <PanelCard label="Form layout" description="Choose how fields are arranged when respondents view this form.">
        <div className="grid grid-cols-3 gap-3">
          {LAYOUT_OPTIONS.map((option) => {
            const isSelected = activeLayout === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onUpdate({ layout: option.value })}
                aria-pressed={isSelected}
                className={`relative flex flex-col items-center gap-3 rounded-lg border-2 p-3 min-h-11 transition-colors ${
                  isSelected
                    ? 'border-(--action-primary-hover) bg-(--accent-soft) ring-2 ring-(--action-primary-hover)/10'
                    : 'border-(--border-default) bg-(--surface-card) hover:border-(--border-strong)'
                }`}
              >
                <div className="w-full h-10 flex items-center justify-center bg-(--bg-sunken) rounded-md px-2">
                  <LayoutPreview value={option.value} />
                </div>
                <span className={`bg-body-sm font-medium ${isSelected ? 'text-(--accent-soft-text)' : 'text-(--text-secondary)'}`}>
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>
      </PanelCard>

      <PanelCard label="Success message" description="Shown to respondents after they submit.">
        <textarea
          value={message}
          maxLength={500}
          onChange={(e) => setMessage(e.target.value)}
          onBlur={() => onUpdate({ successMessage: message })}
          placeholder="Thank you for your response!"
          rows={3}
          className="w-full rounded-md border-2 border-(--border-default) px-3 py-2 bg-body-sm bg-(--surface-card) outline-none focus:border-(--border-strong) resize-none"
        />
        <p className="bg-caption text-(--text-muted) text-right">{message.length}/500</p>
      </PanelCard>

      <PanelCard label="Response limit" description="Automatically stop accepting responses after a set number.">
        <div className="flex items-center justify-between">
          <span className="bg-body-sm font-medium text-(--text-secondary)">Limit responses</span>
          <Switch
            id="response-limit-toggle"
            checked={limitEnabled}
            onChange={(v) => onUpdate({ responseLimit: v ? 1 : undefined, responseLimitEnabled: v })}
          />
        </div>
        <Input
          id="response-limit-value"
          type="number"
          min={1}
          disabled={!limitEnabled}
          value={limitStr}
          onChange={(e) => setLimitStr(e.target.value)}
          onBlur={commitLimit}
          error={limitError ?? undefined}
        />
      </PanelCard>

      <PanelCard label="Close date" description="Automatically close the form at a set date and time.">
        <div className="flex items-center justify-between">
          <span className="bg-body-sm font-medium text-(--text-secondary)">Auto-close on a date</span>
          <Switch
            id="close-date-toggle"
            checked={closeDateEnabled}
            onChange={(v) => onUpdate({ closeDate: v ? new Date().toISOString() : undefined })}
          />
        </div>
        <Input
          id="close-date-value"
          type="datetime-local"
          disabled={!closeDateEnabled}
          value={settings.closeDate ? isoToLocalInput(settings.closeDate) : ''}
          onChange={(e) => onUpdate({ closeDate: e.target.value ? localInputToIso(e.target.value) : undefined })}
        />
        {isPastDate && (
          <p className="bg-caption text-(--warning-text) font-semibold">
            This date is in the past — the form will be immediately closed on publish.
          </p>
        )}
      </PanelCard>

      <PanelCard
        label="Spam protection"
        description="A hidden field is added to the form. Bots that fill it are silently rejected."
      >
        <div className="flex items-center justify-between">
          <span className="bg-body-sm font-medium text-(--text-secondary)">Honeypot spam protection</span>
          <Switch
            id="honeypot-toggle"
            checked={settings.honeypotEnabled}
            onChange={(v) => onUpdate({ honeypotEnabled: v })}
          />
        </div>
      </PanelCard>

      {status === 'published' && slug && (
        <PanelCard label="Public URL" description="Your form's live address.">
          <div className="flex items-center gap-2">
            <Input id="public-url" value={publicUrl} readOnly className="font-mono" />
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(publicUrl);
                toast('Link copied to clipboard.', 'success');
              }}
              className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md p-2 text-(--text-disabled) hover:bg-(--accent-soft) hover:text-(--accent-soft-text)"
              aria-label="Copy public URL"
            >
              <Copy size={16} />
            </button>
          </div>
        </PanelCard>
      )}
    </div>
  );
}
