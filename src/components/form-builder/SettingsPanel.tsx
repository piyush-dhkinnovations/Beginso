'use client';

import { buildPublicFormUrl } from '@/lib/publicFormUrl';
import { useState } from 'react';
import { Copy } from 'lucide-react';
import type { FormSettings, FormStatus } from '@/types/form';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { Switch } from '@/components/ui/Switch';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import type { AccessMode } from '@/types/form';
import { PanelCard } from './PanelCard';

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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="bg-overline border-b border-(--border-default) pb-2 text-(--text-muted)">{children}</h2>;
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

  const publicUrl = buildPublicFormUrl(slug) || '';

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="bg-h3 font-bold text-(--text-primary)">Settings</h1>
        <p className="bg-body text-(--text-muted) mt-1">Control who can respond and how this form behaves.</p>
      </div>

      <SectionLabel>Responses</SectionLabel>
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2 2xl:grid-cols-3">

      {/* Sprint 13 (D1.1, requirements.md 7.1). Plain-language access mode. A form with no stored value is
          Mode 1 (open) — that is what every pre-V2 form is. The new-form default is the backend's call
          (OQ-9); this control only reads and writes `settings.accessMode`. */}
      <PanelCard label="Who can respond" description="Choose who is allowed to submit this form.">
        <Select
          id="access-mode"
          label="Who can respond"
          value={settings.accessMode ?? 'open'}
          onChange={(e) => onUpdate({ accessMode: e.target.value as AccessMode })}
        >
          <option value="open">Anyone with the link</option>
          <option value="tracked">Anyone with the link, with their email</option>
          <option value="login">Signed-in Beginso users only</option>
        </Select>
        {(settings.accessMode ?? 'open') === 'open' && (
          <p className="bg-caption text-(--text-muted)">No email and no tracking — the quickest way for people to respond.</p>
        )}
        {settings.accessMode === 'tracked' && (
          <p className="bg-caption text-(--text-muted)">
            Respondents get an email link to view or correct their submission. The email never contains their answers.
          </p>
        )}
        {settings.accessMode === 'login' && (
          <>
            <p className="bg-caption text-(--text-muted)">
              Respondents get a confirmation email and can also see their submission under My submissions after signing in. The email
              never contains their answers.
            </p>
            <Alert variant="warning" title="Requiring login reduces completions">
              People without an account have to sign up first. Use this for internal forms, not public ones.
            </Alert>
          </>
        )}
      </PanelCard>

      <PanelCard label="Response limit" description="Automatically stop accepting responses after a set number.">
        <div className="flex items-center justify-between">
          <span className="bg-body-sm font-medium text-(--text-secondary)">Limit responses</span>
          <Switch
            id="response-limit-toggle"
            aria-label="Limit responses"
            checked={limitEnabled}
            onChange={(v) => onUpdate({ responseLimit: v ? 1 : undefined, responseLimitEnabled: v })}
          />
        </div>
        {limitEnabled && (
        <Input
          id="response-limit-value"
          type="number"
          min={1}
          value={limitStr}
          onChange={(e) => setLimitStr(e.target.value)}
          onBlur={commitLimit}
          error={limitError ?? undefined}
        />
        )}
      </PanelCard>

      <PanelCard label="Close date" description="Automatically close the form at a set date and time.">
        <div className="flex items-center justify-between">
          <span className="bg-body-sm font-medium text-(--text-secondary)">Auto-close on a date</span>
          <Switch
            id="close-date-toggle"
            aria-label="Auto-close on a date"
            checked={closeDateEnabled}
            onChange={(v) => onUpdate({ closeDate: v ? new Date().toISOString() : undefined })}
          />
        </div>
        {closeDateEnabled && (
        <Input
          id="close-date-value"
          type="datetime-local"
          value={settings.closeDate ? isoToLocalInput(settings.closeDate) : ''}
          onChange={(e) => onUpdate({ closeDate: e.target.value ? localInputToIso(e.target.value) : undefined })}
        />
        )}
        {isPastDate && (
          <p className="bg-caption text-(--warning-text) font-semibold">
            This date is in the past — the form will be immediately closed on publish.
          </p>
        )}
      </PanelCard>


      </div>

      <SectionLabel>After submission</SectionLabel>
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2 2xl:grid-cols-3">

      <PanelCard label="Success message" description="Shown to respondents after they submit.">
        <textarea
          value={message}
          maxLength={500}
          onChange={(e) => setMessage(e.target.value)}
          onBlur={() => onUpdate({ successMessage: message })}
          placeholder="Thank you for your response!"
          rows={4}
          className="w-full rounded-md border-2 border-(--border-default) px-3 py-2 bg-body-sm bg-(--surface-card) outline-none focus:border-(--border-strong) resize-none"
        />
        <p className="bg-caption text-(--text-muted) text-right">{message.length}/500</p>
      </PanelCard>

      </div>

      <SectionLabel>Protection &amp; link</SectionLabel>
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2 2xl:grid-cols-3">

      <PanelCard
        label="Spam protection"
        description="A hidden field is added to the form. Bots that fill it are silently rejected."
      >
        <div className="flex items-center justify-between">
          <span className="bg-body-sm font-medium text-(--text-secondary)">Honeypot spam protection</span>
          <Switch
            id="honeypot-toggle"
            aria-label="Honeypot spam protection"
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
    </div>
  );
}
