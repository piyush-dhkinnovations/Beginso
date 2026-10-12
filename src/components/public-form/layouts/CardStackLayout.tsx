import { FormBanner } from '../FormBanner';
import { Backdrop, cardClass, widthClass, type LayoutFrameProps } from './shared';

// Card Stack: the hero and the form sit on separate stacked cards; each form page is its own section with a
// header. Below 768 the cards go full-bleed (still one column).
export function CardStackLayout({ branding, title, previewMode, children, hideCover }: LayoutFrameProps) {
  return (
    <Backdrop branding={branding} previewMode={previewMode}>
      <div className={`w-full ${widthClass('card_stack', branding)} flex flex-col gap-4 max-md:-m-4 max-md:gap-0`}>
        {!hideCover && (
          <div className={cardClass(branding, 'max-md:rounded-none')}>
            <FormBanner branding={branding} title={title} />
          </div>
        )}
        <div className={cardClass(branding, 'max-md:rounded-none')}>{children}</div>
      </div>
    </Backdrop>
  );
}
