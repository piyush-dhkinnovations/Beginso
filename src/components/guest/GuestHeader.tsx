'use client';

import Link from 'next/link';
import { Cloud, Eye } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Wordmark } from '@/components/landing/Wordmark';
import { cn } from '@/lib/utils';

export type SaveStatus = 'saved' | 'memory' | 'full' | 'stale';

const STATUS_TEXT: Record<SaveStatus, string> = {
  saved: 'Saved on this device',
  memory: 'Not saved: this browser blocks storage. Your form is lost when you close this tab.',
  full: 'Not saved: the draft is over 8 MB. Remove an image to keep saving.',
  stale: 'This draft changed in another tab. Reload to continue.',
};

// Wide (lg and up): logo | form name | save status | Design | Preview | Save to my account, in one row.
// Below lg the row would not fit (QA A10-001/A10-002: the Save button was clipped at 768 and the name input shrank to ~38px at
// 390), so the header becomes: row 1 = logo + actions, row 2 = the form name at full width, row 3 = the save status.
// Below md, Design and Preview move into one menu and the primary button reads just "Save".
export function GuestHeader(props: {
  title: string;
  onTitle: (t: string) => void;
  status: SaveStatus;
  onDesign: () => void;
  onPreview: () => void;
  onSave: () => void;
  /** Offered with the 'stale' status: another tab saved this draft first. */
  onReload?: () => void;
}) {
  const status = <span role="status" className={cn('inline-flex items-center gap-2 bg-body-sm', props.status === 'saved' ? 'text-(--text-secondary)' : 'text-(--error-text)')}><Cloud size={16} aria-hidden="true" />{STATUS_TEXT[props.status]}{props.status === 'stale' && props.onReload && <button type="button" onClick={props.onReload} className="min-h-11 px-2 font-semibold text-(--text-primary) underline underline-offset-2">Reload</button>}</span>;
  return (
    <header className="relative z-30 shrink-0 border-b border-(--border-default) bg-(--surface-card) px-4 py-2 sm:px-8">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 lg:flex-nowrap lg:gap-x-4">
        <Link href="/" aria-label="Beginso home" className="shrink-0"><Wordmark height={36} /></Link>
        <div className="order-last w-full min-w-0 lg:order-none lg:w-auto lg:max-w-sm lg:flex-none lg:basis-80">
          <Input id="guest-form-name" aria-label="Form name" value={props.title} onChange={(e) => props.onTitle(e.target.value)} placeholder="Untitled form" />
        </div>
        <div className="hidden min-w-0 flex-1 lg:block">{status}</div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Button variant="secondary" size="small" className="hidden md:inline-flex" onClick={props.onDesign}>Design</Button>
          <Button variant="secondary" size="small" className="hidden gap-2 md:inline-flex" onClick={props.onPreview}><Eye size={16} aria-hidden="true" />Preview</Button>
          <details className="relative md:hidden">
            <summary className="flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center rounded-md border border-(--border-default)" aria-label="Design and preview">⋯</summary>
            <div onClick={(e) => e.currentTarget.closest("details")?.removeAttribute("open")} className="absolute right-0 z-20 mt-1 flex w-40 flex-col gap-2 rounded-lg border border-(--border-default) bg-(--surface-card) p-3 shadow-(--shadow-md)">
              <Button variant="secondary" size="small" onClick={props.onDesign}>Design</Button>
              <Button variant="secondary" size="small" onClick={props.onPreview}>Preview</Button>
            </div>
          </details>
          <Button size="small" className="whitespace-nowrap" aria-label="Save to my account" onClick={props.onSave}>
            <span className="sm:hidden" aria-hidden="true">Save</span>
            <span className="hidden sm:inline" aria-hidden="true">Save to my account</span>
          </Button>
        </div>
      </div>
      <div className="mt-1 lg:hidden">{status}</div>
    </header>
  );
}
