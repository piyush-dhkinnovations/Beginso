import { FormBanner } from '../FormBanner';
import { Backdrop, cardClass, widthClass, type LayoutFrameProps } from './shared';

// Classic: one centred card under a hero banner carrying the logo and the form headline.
export function ClassicLayout({ branding, title, previewMode, children, hideCover }: LayoutFrameProps) {
  return (
    <Backdrop branding={branding} previewMode={previewMode}>
      <div className={cardClass(branding, widthClass('classic', branding))}>
        {!hideCover && <FormBanner branding={branding} title={title} />}
        {children}
      </div>
    </Backdrop>
  );
}
