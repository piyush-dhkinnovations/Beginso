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
  onClose: () => void;
  closeLabel?: string;
}

/**
 * The full-page, two-column layout every create flow shares (new form, new workspace): the task on the left, a
 * light illustration on the right, a close control top-left. A full white canvas — not a modal, not a dashboard card.
 * Sections rise in one after another (animate-fade-up with a small stagger); the global reduced-motion rule
 * flattens that for people who ask for it.
 */
export function SplitFlowLayout({ eyebrow, title, description, children, illustration, onClose, closeLabel = 'Cancel' }: SplitFlowLayoutProps) {
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

        <aside aria-hidden="true" className="relative hidden items-center justify-center overflow-hidden bg-linear-to-br from-(--bg-subtle) via-(--surface-card) to-(--accent-soft) lg:flex">
          {illustration}
        </aside>
      </div>
    </div>
  );
}
