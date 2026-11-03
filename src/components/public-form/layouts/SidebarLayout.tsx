import { Check } from 'lucide-react';
import { bx } from '@/lib/utils';
import { FormBanner } from '../FormBanner';
import { BrandMark, hasBrandMark, logoPx } from '../BrandMark';
import { Backdrop, cardClass, widthClass, type LayoutFrameProps } from './shared';

// Sidebar: a narrow rail down the left listing every page of the form by name (done, now, still to come) and the form beside it. Below 768 the rail
// becomes one line ("Step 2 of 4 · Your details") above the form. A one-page form has no steps to list, so its rail only carries the logo.
export function SidebarLayout({ branding, title, previewMode, stepNames, currentPage, children, hideCover, hideProgress }: LayoutFrameProps) {
  const steps = stepNames.map((label, i) => ({ label: label || `Step ${i + 1}` }));
  const listed = !hideProgress && steps.length > 1;
  const showRail = listed || hasBrandMark(branding);
  return (
    <Backdrop branding={branding} previewMode={previewMode}>
      <div className={cardClass(branding, `${widthClass('sidebar', branding)} ${showRail ? 'md:grid md:grid-cols-[15rem_minmax(0,1fr)]' : ''}`)}>
        {showRail && (
          <nav aria-label="Form steps" className="hidden flex-col gap-8 border-r border-(--border-default) bg-(--bg-subtle) p-6 md:flex">
            {hasBrandMark(branding) && <BrandMark branding={branding} size={Math.min(logoPx(branding), 48)} className="object-contain" />}
            {listed && (
              <ol className="flex flex-col gap-4">
                {steps.map((s, i) => {
                  const done = i < currentPage;
                  const now = i === currentPage;
                  return (
                    <li key={i} aria-current={now ? 'step' : undefined} className="flex items-center gap-3">
                      <span
                        aria-hidden="true"
                        className={bx(
                          'flex size-6 shrink-0 items-center justify-center rounded-full border-2 bg-body-sm text-xs font-bold',
                          done || now ? 'border-(--action-primary) bg-(--action-primary) text-(--text-on-brand)' : 'border-(--border-strong) text-(--text-muted)',
                        )}
                      >
                        {done ? <Check size={14} /> : i + 1}
                      </span>
                      <span className={bx('bg-body-sm', now ? 'font-semibold text-(--text-primary)' : done ? 'text-(--text-secondary)' : 'text-(--text-muted)')}>{s.label}</span>
                    </li>
                  );
                })}
              </ol>
            )}
          </nav>
        )}
        <div className="min-w-0">
          {!hideCover && <FormBanner branding={branding} title={title} />}
          {listed && (
            <div className="border-b border-(--border-default) bg-(--bg-subtle) px-6 py-3 md:hidden">
              <p className="bg-body-sm font-semibold text-(--text-secondary)">
                Step {currentPage + 1} of {steps.length} · {steps[currentPage]?.label}
              </p>
            </div>
          )}
          {listed && (
            <p role="status" className="sr-only">
              Step {currentPage + 1} of {steps.length}: {steps[currentPage]?.label}
            </p>
          )}
          {children}
        </div>
      </div>
    </Backdrop>
  );
}
