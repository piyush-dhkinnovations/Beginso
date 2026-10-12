import { Progress } from '@/components/ui/Progress';
import { FormBanner } from '../FormBanner';
import { Backdrop, cardClass, widthClass, type LayoutFrameProps } from './shared';

// Guided: one question at a time, centred in the viewport as a deliberate focus screen (brand wash behind, generous
// card). The shell shows a single field; this frame shows overall progress ("Question N of M"). Per decision 18 Guided
// is always followed by review-before-submit (task 3.13) — do not publish a form with this layout before that step exists.
export function GuidedLayout({ branding, title, previewMode, question, children, hideCover, hideProgress }: LayoutFrameProps) {
  return (
    <Backdrop branding={branding} previewMode={previewMode}>
      <div className={cardClass(branding, widthClass('guided', branding))}>
        {!hideCover && <FormBanner branding={branding} title={title} />}
        {!hideProgress && question && question.total > 1 && (
          <div className="px-6 pt-6 md:px-8">
            <p className="bg-caption font-semibold text-(--text-muted) mb-2">
              Question {question.current} of {question.total}
            </p>
            <Progress value={question.current} max={question.total} size="small" aria-label="Form progress" />
          </div>
        )}
        {children}
      </div>
    </Backdrop>
  );
}
