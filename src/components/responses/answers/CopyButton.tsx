'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CopyButtonProps {
  text: string;
  /** The question, so the button is announced as "Copy answer to Your name". */
  label: string;
  className?: string;
}

/** Appears on hover or keyboard focus of its row (always on touch screens). Announces "Copied". */
export function CopyButton({ text, label, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked: nothing was copied, so nothing is announced */
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void copy()}
        aria-label={`Copy answer to ${label}`}
        className={cn(
          'flex size-7 shrink-0 items-center justify-center rounded-md text-(--text-muted) opacity-0 hover:bg-(--surface-hover) hover:text-(--text-primary) focus-visible:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:opacity-100',
          className
        )}
      >
        {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? 'Copied' : ''}
      </span>
    </>
  );
}
