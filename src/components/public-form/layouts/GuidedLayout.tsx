import { Progress } from '@/components/ui/Progress';
import { FormBanner } from '../FormBanner';
import { Backdrop, type LayoutFrameProps } from './shared';

// Guided: one question at a time. The shell shows a single field; this frame shows overall progress
// ("Question N of M"). Per decision 18 Guided is always followed by review-before-submit (task 3.13) —
// do not publish a form with this layout before that step exists.
export function GuidedLayout({ branding, previewMode, question, children }: LayoutFrameProps) {
  return (
    <Backdrop previewMode={previewMode}>
      <div className="bg-(--surface-card) rounded-xl border border-(--border-default) shadow-(--shadow-sm) w-full overflow-hidden max-w-130">
        <FormBanner branding={branding} />
        {question && question.total > 1 && (
          <div className="px-6 pt-5">
            <p className="bg-caption text-(--text-muted) mb-1">
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
