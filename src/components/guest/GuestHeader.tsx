'use client';

import Link from 'next/link';
import { Cloud, Eye } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Wordmark } from '@/components/landing/Wordmark';
import { cn } from '@/lib/utils';

export type SaveStatus = 'saved' | 'memory' | 'full';

const STATUS_TEXT: Record<SaveStatus, string> = {
  saved: 'Saved on this device',
  memory: 'Not saved: this browser blocks storage. Your form is lost when you close this tab.',
  full: 'Not saved: the draft is over 8 MB. Remove an image to keep saving.',
};

// logo | form title | save status | Design | Preview | Save to my account. Below 768px the header keeps logo, title and the
// primary button; Design and Preview move into one menu, and the status drops to its own line.
export function GuestHeader(props: {
  title: string;
  onTitle: (t: string) => void;
  status: SaveStatus;
  onDesign: () => void;
  onPreview: () => void;
  onSave: () => void;
}) {
  const status = <span role="status" className={cn('inline-flex items-center gap-2 bg-body-sm', props.status === 'saved' ? 'text-(--text-secondary)' : 'text-(--error-text)')}><Cloud size={16} aria-hidden="true" />{STATUS_TEXT[props.status]}</span>;
  return (
    <header className="relative z-30 shrink-0 border-b border-(--border-default) bg-(--surface-card) px-4 py-2 sm:px-8">
      <div className="flex items-center gap-3 md:gap-4">
        <Link href="/" aria-label="Beginso home" className="shrink-0"><Wordmark height={36} /></Link>
        <div className="min-w-0 flex-1 md:max-w-sm md:flex-none md:basis-80">
          <Input id="guest-form-name" aria-label="Form name" value={props.title} onChange={(e) => props.onTitle(e.target.value)} placeholder="Untitled form" />
        </div>
        <div className="hidden min-w-0 flex-1 md:block">{status}</div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="secondary" size="small" className="hidden md:inline-flex lg:hidden" onClick={props.onDesign}>Design</Button>
          <Button variant="secondary" size="small" className="hidden gap-2 md:inline-flex" onClick={props.onPreview}><Eye size={16} aria-hidden="true" />Preview</Button>
          <details className="relative md:hidden">
            <summary className="flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center rounded-md border border-(--border-default)" aria-label="Design and preview">⋯</summary>
            <div onClick={(e) => e.currentTarget.closest("details")?.removeAttribute("open")} className="absolute right-0 z-20 mt-1 flex w-40 flex-col gap-2 rounded-lg border border-(--border-default) bg-(--surface-card) p-3 shadow-(--shadow-md)">
              <Button variant="secondary" size="small" onClick={props.onDesign}>Design</Button>
              <Button variant="secondary" size="small" onClick={props.onPreview}>Preview</Button>
            </div>
          </details>
          <Button size="small" onClick={props.onSave}>Save to my account</Button>
        </div>
      </div>
      <div className="mt-1 md:hidden">{status}</div>
    </header>
  );
}
