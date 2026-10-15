'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FIELD_TYPE_CONFIG } from '@/components/form-builder/Toolbox';
import { useBuilderStore } from '@/store/builderStore';
import { cn } from '@/lib/utils';
import { DesignControls } from './DesignDrawer';
import type { FieldType } from '@/types/form';

const BASIC: FieldType[] = ['short_text', 'long_text', 'email', 'phone', 'multiple_choice', 'dropdown', 'checkbox', 'rating', 'date', 'file_upload'];

// Two-tab strip shared by both side panels.
function Tabs<T extends string>({ tabs, value, onChange, label }: { tabs: { id: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="mb-5 flex border-b border-(--border-default)">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={cn('-mb-px min-h-11 flex-1 border-b-2 px-2 bg-body-sm font-semibold', value === t.id ? 'border-(--action-primary) text-(--text-link)' : 'border-transparent text-(--text-secondary) hover:text-(--text-primary)')}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function FieldButton({ type, onAdd }: { type: FieldType; onAdd: (t: FieldType) => void }) {
  const c = FIELD_TYPE_CONFIG.find((x) => x.type === type)!;
  return (
    <button type="button" onClick={() => onAdd(type)} className="flex min-h-10 w-full items-center gap-3 rounded-md border border-(--border-default) bg-(--surface-card) px-3 text-left bg-body-sm font-medium text-(--text-primary) hover:border-(--border-strong) hover:bg-(--surface-hover)">
      <c.icon size={16} className="shrink-0 text-(--text-muted)" aria-hidden="true" />
      {c.label}
    </button>
  );
}

// Left panel: add questions, and the form's confirmation message.
export function LeftPanel({ onAdd }: { onAdd: (t: FieldType) => void }) {
  const [tab, setTab] = useState<'fields' | 'form'>('fields');
  const successMessage = useBuilderStore((s) => s.settings.successMessage ?? '');
  const advanced = FIELD_TYPE_CONFIG.map((c) => c.type).filter((t) => !BASIC.includes(t));

  return (
    <div>
      <Tabs label="Left panel" value={tab} onChange={setTab} tabs={[{ id: 'fields', label: 'Add fields' }, { id: 'form', label: 'Form settings' }]} />
      {tab === 'fields' ? (
        <div className="flex flex-col gap-5">
          <section className="flex flex-col gap-2">
            <h3 className="bg-body-sm font-semibold text-(--text-secondary)">Basic fields</h3>
            {BASIC.map((t) => <FieldButton key={t} type={t} onAdd={onAdd} />)}
          </section>
          <section className="flex flex-col gap-2 border-t border-(--border-default) pt-5">
            <h3 className="bg-body-sm font-semibold text-(--text-secondary)">More fields</h3>
            {advanced.map((t) => <FieldButton key={t} type={t} onAdd={onAdd} />)}
          </section>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <label htmlFor="guest-success" className="bg-body-sm font-semibold text-(--text-primary)">Message after someone submits</label>
          <textarea
            id="guest-success"
            rows={4}
            value={successMessage}
            onChange={(e) => useBuilderStore.getState().setSettings({ successMessage: e.target.value })}
            placeholder="Thanks, we received your response."
            className="w-full rounded-md border border-(--border-default) bg-(--surface-card) p-3 bg-body-sm text-(--text-primary) focus:border-(--border-focus) focus:outline-none"
          />
          <p className="bg-caption text-(--text-muted)">More options (close date, response limit, conditional logic) are available after you sign up.</p>
        </div>
      )}
    </div>
  );
}

// Right panel: how the form looks, and what saving to an account does.
export function RightPanel({ onSave }: { onSave: () => void }) {
  const [tab, setTab] = useState<'design' | 'account'>('design');
  const step = (text: ReactNode) => (
    <li className="flex gap-2 bg-body-sm text-(--text-secondary)">
      <Check size={16} className="mt-0.5 shrink-0 text-(--success-text)" aria-hidden="true" />
      {text}
    </li>
  );
  return (
    <div>
      <Tabs label="Right panel" value={tab} onChange={setTab} tabs={[{ id: 'design', label: 'Design' }, { id: 'account', label: 'Settings' }]} />
      {tab === 'design' ? (
        <DesignControls />
      ) : (
        <div className="flex flex-col gap-5">
          <section className="flex flex-col gap-2">
            <h3 className="bg-body font-semibold text-(--text-primary)">Where your form is</h3>
            <p className="bg-body-sm text-(--text-secondary)">It is saved on this device and kept for 30 days. Nobody else can see it yet.</p>
          </section>
          <section className="flex flex-col gap-3 border-t border-(--border-default) pt-5">
            <h3 className="bg-body font-semibold text-(--text-primary)">Save it to a free account</h3>
            <ul className="flex flex-col gap-2">
              {step('Sign up with Google or email')}
              {step('Your questions and design move into your account')}
              {step('Publish from there to get a link')}
            </ul>
            <Button onClick={onSave} className="w-full">Save to my account</Button>
            <p className="bg-body-sm text-(--text-secondary)">
              Already have an account?{' '}
              <Link href="/login?next=%2Fforms%2Fclaim" className="font-medium text-(--text-link) underline underline-offset-2">Log in</Link>
            </p>
            <p className="bg-caption text-(--text-muted)">Use this same browser so we can find your draft.</p>
          </section>
        </div>
      )}
    </div>
  );
}
