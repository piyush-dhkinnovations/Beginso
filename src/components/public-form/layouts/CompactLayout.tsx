import { FormBanner } from '../FormBanner';
import { Backdrop, cardClass, widthClass, type LayoutFrameProps } from './shared';

// Compact: two-column (see fieldsClassFor) for dense internal forms — plain and quick on purpose, so a wider card.
// Never two columns on a phone — the grid is forced to one column below 768.
export function CompactLayout({ branding, title, previewMode, children, hideCover }: LayoutFrameProps) {
  return (
    <Backdrop branding={branding} previewMode={previewMode}>
      <div className={cardClass(branding, widthClass('compact', branding))}>
        {!hideCover && <FormBanner branding={branding} title={title} />}
        {children}
      </div>
    </Backdrop>
  );
}
