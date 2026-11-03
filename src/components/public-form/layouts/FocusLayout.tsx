import { Progress } from '@/components/ui/Progress';
import { Backdrop, widthClass, type LayoutFrameProps } from './shared';

// Focus: one question at a time, full screen, no card. A thin progress line at the top of the page, the form's name in small type above, and the
// question set large in the middle of the page. Same one-at-a-time flow as Guided (review before submit, Back, Enter to go on).
export function FocusLayout({ branding, title, previewMode, question, children, hideProgress }: LayoutFrameProps) {
  const showProgress = !hideProgress && question && question.total > 1;
  return (
    <Backdrop branding={branding} previewMode={previewMode}>
      <div className={`flex w-full flex-col gap-8 py-4 md:py-8 ${widthClass('focus', branding)}`}>
        <div className="flex flex-col gap-3 px-6 md:px-8">
          {title && (
            <p aria-hidden="true" className="form-heading bg-body-sm font-semibold text-(--text-muted)">
              {title}
            </p>
          )}
          {showProgress && (
            <div className="flex flex-col gap-1.5">
              <p className="bg-caption font-semibold text-(--text-muted)">
                Question {question.current} of {question.total}
              </p>
              <Progress value={question.current} max={question.total} size="small" aria-label="Form progress" />
            </div>
          )}
        </div>
        {/* the question and its answer sit straight on the page: no card around them */}
        <div className="form-focus-body [&_[data-field-id]>:first-child]:text-2xl [&_[data-field-id]>:first-child]:leading-tight [&_[data-field-id]>:first-child]:font-semibold [&_input:not([type=radio]):not([type=checkbox])]:min-h-14 [&_input:not([type=radio]):not([type=checkbox])]:text-lg">
          {children}
        </div>
      </div>
    </Backdrop>
  );
}
