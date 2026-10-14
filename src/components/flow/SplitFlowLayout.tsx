import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface SplitFlowLayoutProps {
  /** Small uppercase label above the heading, e.g. "Create form". */
  eyebrow: string;
  title: string;
  description: string;
  /** The task itself — the form. One task per screen. */
  children: ReactNode;
  /** Decorative; hidden below the lg breakpoint, where the task takes the whole screen. */
  illustration: ReactNode;
  /** The solid colour of the right panel, and the headline and line shown on it. */
  tint: string;
  panelTitle: string;
  panelText: string;
  onClose: () => void;
  closeLabel?: string;
}

/**
 * The full-page, two-column layout every create flow shares (new form, new workspace): the task on the left, a
 * light illustration on the right, a close control top-left. A full white canvas — not a modal, not a dashboard card.
 * Sections rise in one after another (animate-fade-up with a small stagger); the global reduced-motion rule
 * flattens that for people who ask for it.
 */
export function SplitFlowLayout({ eyebrow, title, description, children, illustration, tint, panelTitle, panelText, onClose, closeLabel = 'Cancel' }: SplitFlowLayoutProps) {
  return (
    <div className="relative min-h-screen bg-(--surface-card)">
      <div className="absolute left-4 top-4 z-10 sm:left-8 sm:top-6">
        <Button variant="ghost" size="small" onClick={onClose} className="gap-2 text-(--text-secondary)">
          <X size={18} aria-hidden="true" />
          {closeLabel}
        </Button>
      </div>

      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        <main className="flex flex-col justify-center px-6 pb-10 pt-20 sm:px-12 lg:px-20 xl:px-28">
          <div className="mx-auto w-full max-w-xl">
            <p className="animate-fade-up bg-overline text-(--action-primary)">{eyebrow}</p>
            <h1 className="animate-fade-up mt-3 bg-h2 font-bold text-(--text-primary) [animation-delay:60ms]">{title}</h1>
            <p className="animate-fade-up mt-3 max-w-[48ch] bg-body text-(--text-muted) [animation-delay:120ms]">{description}</p>
            <div className="animate-fade-up mt-7 [animation-delay:180ms]">{children}</div>
          </div>
        </main>

        <aside aria-hidden="true" className="relative hidden flex-col gap-6 overflow-hidden p-12 text-white lg:flex xl:p-16" style={{ backgroundColor: tint }}>
          {/* Rings bleeding off the corner, drifting slowly: depth without a blurry gradient. */}
          <div className="aa-blob pointer-events-none absolute -bottom-40 -right-40 size-175 rounded-full border border-white/15" />
          <div className="aa-blob pointer-events-none absolute -bottom-20 -right-20 size-125 rounded-full border border-white/15" style={{ animationDelay: '-3s' }} />
          <div className="aa-blob pointer-events-none absolute -left-32 -top-32 size-96 rounded-full bg-white/8" style={{ animationDelay: '-6s' }} />
          <div className="aa-slide relative max-w-md">
            <h2 className="m-0 bg-h1 font-bold leading-tight text-white text-balance">{panelTitle}</h2>
            <p className="m-0 mt-3 bg-body-lg text-white/85">{panelText}</p>
          </div>
          <div className="relative flex flex-1 items-center justify-center">{illustration}</div>
        </aside>
      </div>
    </div>
  );
}
