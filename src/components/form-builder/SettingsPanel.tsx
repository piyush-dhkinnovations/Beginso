'use client';

import { useState } from 'react';
import { Copy } from 'lucide-react';
import type { FormSettings, FormStatus } from '@/types/form';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/common/Toast';
import { Switch } from './PropertiesPanel';
import { PanelCard } from './PanelCard';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

// Local (not UTC) "now" formatted for <input type="datetime-local">
function nowForDateTimeLocal(): string {
  const d = new Date();
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
  const limitEnabled = settings.responseLimit !== undefined;
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
    onUpdate({ responseLimit: n });
  };

  // ── Close date ────────────────────────────────────────────────────────────────
  const closeDateEnabled = settings.closeDate !== undefined;
  const isPastDate = closeDateEnabled && new Date(settings.closeDate!) < new Date();

  const publicUrl = slug ? `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/f/${slug}` : '';

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <div>
        <h2 className="text-heading-1 font-bold text-neutral-900">Settings</h2>
        <p className="text-body text-neutral-500 mt-1">Control how respondents interact with this form.</p>
      </div>

      <PanelCard label="Success message" description="Shown to respondents after they submit.">
        <textarea
          value={message}
          maxLength={500}
          onChange={(e) => setMessage(e.target.value)}
          onBlur={() => onUpdate({ successMessage: message })}
          placeholder="Thank you for your response!"
          rows={3}
          className="w-full rounded-md border-2 border-neutral-200 px-3 py-2 text-[13px] bg-white outline-none focus:border-neutral-500 resize-none"
        />
        <p className="text-caption text-neutral-400 text-right">{message.length}/500</p>
      </PanelCard>

      <PanelCard label="Response limit" description="Automatically stop accepting responses after a set number.">
        <div className="flex items-center justify-between">
          <span className="text-body-sm font-medium text-neutral-700">Limit responses</span>
          <Switch
            id="response-limit-toggle"
            checked={limitEnabled}
            onChange={(v) => onUpdate({ responseLimit: v ? 1 : undefined })}
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
          <span className="text-body-sm font-medium text-neutral-700">Auto-close on a date</span>
          <Switch
            id="close-date-toggle"
            checked={closeDateEnabled}
            onChange={(v) => onUpdate({ closeDate: v ? nowForDateTimeLocal() : undefined })}
          />
        </div>
        <Input
          id="close-date-value"
          type="datetime-local"
          disabled={!closeDateEnabled}
          value={settings.closeDate ?? ''}
          onChange={(e) => onUpdate({ closeDate: e.target.value || undefined })}
        />
        {isPastDate && (
          <p className="text-caption text-warning font-semibold">
            This date is in the past — the form will be immediately closed on publish.
          </p>
        )}
      </PanelCard>

      <PanelCard
        label="Spam protection"
        description="A hidden field is added to the form. Bots that fill it are silently rejected."
      >
        <div className="flex items-center justify-between">
          <span className="text-body-sm font-medium text-neutral-700">Honeypot spam protection</span>
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
              className="p-2 text-neutral-400 hover:text-brand-700 hover:bg-brand-50 rounded-md shrink-0 min-w-[38px] min-h-[38px] flex items-center justify-center"
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
