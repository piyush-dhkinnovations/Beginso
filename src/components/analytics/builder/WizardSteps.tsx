'use client';

import { Check } from 'lucide-react';
import { bx } from '@/lib/utils';

export interface WizardStep {
  label: string;
  /** What the step is for, shown under its name until it is done (then what was chosen). */
  hint?: string;
  /** What was chosen, shown under a finished step ("Simple chart", the form's name). */
  value?: string;
}

interface WizardStepsProps {
  steps: WizardStep[];
  current: number;
  /** A finished step is a button that goes back to it; later steps cannot be clicked. */
  onGoTo: (index: number) => void;
}

/**
 * The steps in one row across the top of the builder: an ordered list, the current step marked `aria-current="step"`, finished steps with a
 * check and what was chosen, and a line from each step to the next that turns green once the step is done. Under `md` only the current
 * step keeps its name, so the row never needs a second line.
 */
export function WizardSteps({ steps, current, onGoTo }: WizardStepsProps) {
  return (
    <nav aria-label="Chart steps" className="rounded-xl border border-(--border-default) bg-(--surface-card) px-4 py-3 md:px-5">
      <ol className="m-0 flex min-w-0 list-none items-center gap-3 p-0">
        {steps.map((step, i) => {
          const done = i < current;
          const isCurrent = i === current;
          const last = i === steps.length - 1;
          const body = (
            <>
              <span
                aria-hidden="true"
                className={bx(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 bg-body-sm font-semibold',
                  done && 'border-(--success) bg-(--success) text-white',
                  isCurrent && 'border-(--action-primary) bg-(--accent-soft) text-(--action-primary)',
                  !done && !isCurrent && 'border-(--border-default) text-(--text-muted)',
                )}
              >
                {done ? <Check size={14} /> : i + 1}
              </span>
              <span className={bx('min-w-0 flex-col text-left', isCurrent ? 'flex' : 'sr-only md:not-sr-only md:flex')}>
                <span className={bx('truncate bg-body-sm font-semibold', isCurrent ? 'text-(--text-primary)' : 'text-(--text-secondary)')}>
                  {step.label}
                  {done && <span className="sr-only"> (done)</span>}
                </span>
                <span className="hidden truncate bg-caption text-(--text-muted) md:block">{done && step.value ? step.value : step.hint}</span>
              </span>
            </>
          );
          return (
            <li key={step.label} aria-current={isCurrent ? 'step' : undefined} className={bx('flex min-w-0 items-center gap-3', last ? 'shrink-0' : 'flex-1', isCurrent && 'max-md:flex-1')}>
              {done ? (
                <button
                  type="button"
                  onClick={() => onGoTo(i)}
                  className="-mx-1 flex min-w-0 items-center gap-3 rounded-lg px-1 py-0.5 text-left hover:bg-(--surface-hover) focus-visible:outline-2 focus-visible:outline-(--border-focus)"
                >
                  {body}
                </button>
              ) : (
                <div className="flex min-w-0 items-center gap-3">{body}</div>
              )}
              {/* the line to the next step: green once this one is done */}
              {!last && <span aria-hidden="true" className={bx('h-0.5 min-w-4 flex-1 rounded-full', done ? 'bg-(--success)' : 'bg-(--border-default)', isCurrent && 'max-md:hidden')} />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
