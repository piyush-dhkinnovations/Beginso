'use client';

import { useState } from 'react';
import type { FormSettings } from '@/types/form';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import type { AccessMode } from '@/types/form';

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
  onUpdate: (updates: Partial<FormSettings>) => void;
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="bg-h5 font-semibold text-(--text-primary)">{title}</h2>
      <div className="flex flex-col divide-y divide-(--border-default) rounded-xl border border-(--border-default) bg-(--surface-card) shadow-(--shadow-sm)">{children}</div>
    </section>
  );
}

/** One setting: its name and a line of help on the left, the control on the right (under them on a phone); `children` is what opens below it. */
function Row({ label, description, control, children }: { label: string; description: string; control?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1 basis-60">
          <p className="bg-body font-medium text-(--text-primary)">{label}</p>
          <p className="bg-body-sm text-(--text-muted)">{description}</p>
        </div>
        {control}
      </div>
      {children}
    </div>
  );
}

export function SettingsPanel({ settings, onUpdate }: SettingsPanelProps) {
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


  return (
    // Each group is a card of rows (name and help on the left, the control on the right). From 1024px the groups sit in two columns:
    // who can respond and its limits on the left, what happens after and protection on the right.
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="bg-h3 font-bold text-(--text-primary)">Settings</h1>
        <p className="bg-body text-(--text-muted) mt-1">Control who can respond and how this form behaves.</p>
      </div>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
      <Group title="Responses">
        {/* Sprint 13 (D1.1, requirements.md 7.1). Plain-language access mode. A form with no stored value is
            Mode 1 (open) — that is what every pre-V2 form is. The new-form default is the backend's call
            (OQ-9); this control only reads and writes `settings.accessMode`. */}
        <Row
          label="Who can respond"
          description="Choose who is allowed to submit this form."
          control={
            /* A form stored as the old "login" mode is the same gate as "tracked" (the server reads it that way), so it shows as that. */
            <div className="w-full sm:w-64">
              <Select
                id="access-mode"
                aria-label="Who can respond"
                value={settings.accessMode === 'tracked' || settings.accessMode === 'login' ? 'tracked' : 'open'}
                onChange={(e) => onUpdate({ accessMode: e.target.value as AccessMode })}
              >
                <option value="open">Anyone with the link</option>
                <option value="tracked">Anyone with a verified email</option>
              </Select>
            </div>
          }
        >
          {(settings.accessMode ?? 'open') === 'open' ? (
            <p className="bg-caption text-(--text-muted)">No email and no tracking: the quickest way for people to respond.</p>
          ) : (
            <>
              <p className="bg-caption text-(--text-muted)">
                Before the form starts, people confirm their email with a 6-digit code we send them, or continue with Google. You see who
                responded, and they can find their submission again. The emails never contain their answers.
              </p>
              <Alert variant="info" title="Fewer people may finish">
                Asking for a verified email adds a step. Use it when you need to know who responded, not for a quick public poll.
              </Alert>
            </>
          )}
        </Row>

        <Row
          label="Limit responses"
          description="Stop accepting responses after a set number."
          control={
            <Switch
              id="response-limit-toggle"
              aria-label="Limit responses"
              checked={limitEnabled}
              onChange={(v) => onUpdate({ responseLimit: v ? 1 : undefined, responseLimitEnabled: v })}
            />
          }
        >
          {limitEnabled && (
            <div className="w-full sm:w-48">
              <Input
                id="response-limit-value"
                aria-label="Number of responses"
                type="number"
                min={1}
                value={limitStr}
                onChange={(e) => setLimitStr(e.target.value)}
                onBlur={commitLimit}
                error={limitError ?? undefined}
              />
            </div>
          )}
        </Row>

        <Row
          label="Close on a date"
          description="Stop accepting responses at a set date and time."
          control={
            <Switch
              id="close-date-toggle"
              aria-label="Auto-close on a date"
              checked={closeDateEnabled}
              onChange={(v) => onUpdate({ closeDate: v ? new Date().toISOString() : undefined })}
            />
          }
        >
          {closeDateEnabled && (
            <div className="w-full sm:w-64">
              <Input
                id="close-date-value"
                aria-label="Close date and time"
                type="datetime-local"
                value={settings.closeDate ? isoToLocalInput(settings.closeDate) : ''}
                onChange={(e) => onUpdate({ closeDate: e.target.value ? localInputToIso(e.target.value) : undefined })}
              />
            </div>
          )}
          {isPastDate && (
            <p className="bg-caption text-(--warning-text) font-semibold">
              This date is in the past — the form will be immediately closed on publish.
            </p>
          )}
        </Row>
      </Group>

      <div className="flex min-w-0 flex-col gap-8">
      <Group title="After submission">
        <Row label="Success message" description="Shown to respondents after they submit.">
          <textarea
            aria-label="Success message"
            value={message}
            maxLength={500}
            onChange={(e) => setMessage(e.target.value)}
            onBlur={() => onUpdate({ successMessage: message })}
            placeholder="Thank you for your response!"
            rows={3}
            className="w-full rounded-md border border-(--border-default) px-3 py-2 bg-body-sm bg-(--surface-card) outline-none focus:border-(--border-focus) resize-none"
          />
          <p className="bg-caption text-(--text-muted) text-right">{message.length}/500</p>
        </Row>
      </Group>

      <Group title="Protection">
        <Row
          label="Spam protection"
          description="A hidden field is added to the form. Bots that fill it are silently rejected."
          control={
            <Switch
              id="honeypot-toggle"
              aria-label="Honeypot spam protection"
              checked={settings.honeypotEnabled}
              onChange={(v) => onUpdate({ honeypotEnabled: v })}
            />
          }
        />
      </Group>
      </div>
      </div>
    </div>
  );
}
