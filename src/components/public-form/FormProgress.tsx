import { Check } from 'lucide-react';
import { bx } from '@/lib/utils';
import type { ProgressStyle } from '@/types/form';

interface FormProgressProps {
  currentPage: number; // 1-based
  totalPages: number;
  /** How it is drawn: a bar (the default), a row of dots, or numbered steps joined by a line. */
  style?: ProgressStyle;
}

/** Multi-page progress. Renders nothing for single-page forms. */
export function FormProgress({ currentPage, totalPages, style = 'bar' }: FormProgressProps) {
  if (totalPages <= 1) return null;

  const percent = Math.round((currentPage / totalPages) * 100);
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  if (style === 'dots') {
    return (
      <div className="mb-4 flex flex-col items-center gap-2" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={`Step ${currentPage} of ${totalPages}`}>
        <div className="flex items-center gap-2" aria-hidden="true">
          {pages.map((n) => (
            <span
              key={n}
              className={bx('h-2.5 rounded-full transition-all duration-300', n === currentPage ? 'w-6 bg-(--action-primary)' : n < currentPage ? 'w-2.5 bg-(--action-primary)' : 'w-2.5 bg-(--border-default)')}
            />
          ))}
        </div>
        <span className="bg-caption text-(--text-muted)">Step {currentPage} of {totalPages}</span>
      </div>
    );
  }

  if (style === 'steps') {
    return (
      <ol className="mb-4 flex list-none items-center p-0" aria-label={`Step ${currentPage} of ${totalPages}`}>
        {pages.map((n) => {
          const done = n < currentPage;
          const current = n === currentPage;
          return (
            <li key={n} aria-current={current ? 'step' : undefined} className={bx('flex items-center', n < totalPages && 'flex-1')}>
              <span
                className={bx(
                  'flex size-7 flex-none items-center justify-center rounded-full border-2 bg-caption font-semibold transition-colors duration-300',
                  done || current ? 'border-(--action-primary) bg-(--action-primary) text-(--text-on-brand)' : 'border-(--border-strong) text-(--text-muted)',
                )}
              >
                {done ? <Check size={14} aria-label="done" /> : n}
              </span>
              {n < totalPages && <span aria-hidden="true" className={bx('mx-2 h-0.5 flex-1 rounded-full transition-colors duration-300', done ? 'bg-(--action-primary)' : 'bg-(--border-default)')} />}
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <div className="mb-4">
      <div className="flex justify-between bg-caption text-(--text-muted) mb-1">
        <span>Step {currentPage} of {totalPages}</span>
        <span>{percent}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-1.5 w-full bg-(--border-default) rounded-full overflow-hidden"
      >
        <div
          className="h-full bg-(--action-primary) rounded-full transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
