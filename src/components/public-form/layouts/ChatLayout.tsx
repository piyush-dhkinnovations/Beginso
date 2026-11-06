import { Progress } from '@/components/ui/Progress';
import { brandPanelStyle } from '@/lib/formTheme';
import { BrandMark, hasBrandMark } from '../BrandMark';
import { BannerExtras } from '../BannerExtras';
import { Backdrop, cardClass, widthClass, type LayoutFrameProps } from './shared';

// Chat: one question at a time, asked like a message. A slim header (the logo or a colour dot, the form's name and where the person is) sits above
// a speech bubble that holds the question and its answer box. It uses the same one-at-a-time flow as Guided (review before submit, Back, Enter to go
// on); only the look is different. The title is drawn aria-hidden because the form's own h1 (screen readers) already says it.
export function ChatLayout({ branding, title, previewMode, question, children, hideProgress, hideCover }: LayoutFrameProps) {
  const showProgress = !hideProgress && question && question.total > 1;
  return (
    <Backdrop branding={branding} previewMode={previewMode}>
      <div className={`flex w-full flex-col gap-3 ${widthClass('chat', branding)}`}>
        {!hideCover && (
          <div className={cardClass(branding, 'flex items-center gap-3 px-4 py-3')}>
            {hasBrandMark(branding) ? (
              <span className="flex-none">
                <BrandMark branding={branding} size={36} className="object-contain" />
              </span>
            ) : (
              <span aria-hidden="true" className="size-9 flex-none rounded-full" style={brandPanelStyle(branding)} />
            )}
            <div className="flex min-w-0 flex-col">
              {title && (
                <p aria-hidden="true" className="form-heading truncate bg-body font-bold text-(--form-heading)">
                  {title}
                </p>
              )}
              {showProgress ? (
                <p className="bg-caption text-(--text-muted)">
                  Question {question.current} of {question.total}
                </p>
              ) : (
                <BannerExtras branding={branding} />
              )}
            </div>
          </div>
        )}
        {showProgress && <Progress value={question.current} max={question.total} size="small" aria-label="Form progress" />}
        <div className="flex items-start gap-2">
          <span aria-hidden="true" className="mt-2 size-7 flex-none rounded-full max-[480px]:hidden" style={brandPanelStyle(branding)} />
          {/* the bubble: the card with a squarer corner where the speech starts */}
          <div className="min-w-0 flex-1">
            <div className={cardClass(branding, 'rounded-tl-md!')}>{children}</div>
          </div>
        </div>
      </div>
    </Backdrop>
  );
}
