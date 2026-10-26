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
 * The left-hand list of steps: an ordered list, the current step marked `aria-current="step"`, finished steps with a check and what was
 * chosen. On a phone it becomes one row (the current step's name stays visible) so the form below keeps the room.
 */
export function WizardSteps({ steps, current, onGoTo }: WizardStepsProps) {
  return (
    <nav aria-label="Chart steps">
      <ol className="m-0 flex min-w-0 list-none gap-3 p-0 lg:flex-col lg:gap-5">
        {steps.map((step, i) => {
          const done = i < current;
          const isCurrent = i === current;
          const body = (
            <>
              <span
                aria-hidden="true"
                className={bx(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 bg-body-sm font-semibold lg:h-9 lg:w-9 lg:bg-body',
                  done && 'border-(--success) bg-(--success) text-white',
                  isCurrent && 'border-(--action-primary) text-(--action-primary)',
                  !done && !isCurrent && 'border-(--border-default) text-(--text-muted)',
                )}
              >
                {done ? <Check size={14} /> : i + 1}
              </span>
              <span className={bx('min-w-0 flex-col text-left', isCurrent ? 'flex' : 'hidden lg:flex')}>
                <span className={bx('truncate bg-body font-semibold', isCurrent ? 'text-(--text-primary)' : 'text-(--text-secondary)')}>
                  {step.label}
                  {done && <span className="sr-only"> (done)</span>}
                </span>
                <span className="truncate bg-caption text-(--text-muted)">{done && step.value ? step.value : step.hint}</span>
              </span>
            </>
          );
          return (
            <li key={step.label} aria-current={isCurrent ? 'step' : undefined} className={bx('relative min-w-0', isCurrent && 'max-lg:flex-1')}>
              {/* the line from this step's circle down to the next one: green once this step is done */}
              {i < steps.length - 1 && <span aria-hidden="true" className={bx('absolute top-[2.8rem] -bottom-4 left-[1.6rem] hidden w-0.5 rounded-full lg:block', done ? 'bg-(--success)' : 'bg-(--border-default)')} />}
              {done ? (
                <button
                  type="button"
                  onClick={() => onGoTo(i)}
                  className="flex w-full items-center gap-3 rounded-lg px-0 py-1 text-left hover:bg-(--surface-hover) focus-visible:outline-2 focus-visible:outline-(--border-focus) lg:px-2"
                >
                  {body}
                </button>
              ) : (
                <div className="flex items-center gap-3 px-0 py-1 lg:px-2">{body}</div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
