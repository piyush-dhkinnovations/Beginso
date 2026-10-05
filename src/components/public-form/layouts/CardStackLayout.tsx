import { FormBanner } from '../FormBanner';
import { Backdrop, type LayoutFrameProps } from './shared';

// Card Stack: the banner and the form sit on separate stacked cards; below 768 the cards go
// full-bleed (still one column).
export function CardStackLayout({ branding, previewMode, children }: LayoutFrameProps) {
  return (
    <Backdrop previewMode={previewMode}>
      <div className="w-full max-w-130 self-start flex flex-col gap-4 max-md:-m-4 max-md:gap-0">
        <div className="bg-(--surface-card) rounded-xl border border-(--border-default) shadow-(--shadow-sm) overflow-hidden max-md:rounded-none max-md:border-x-0">
          <FormBanner branding={branding} />
        </div>
        <div className="bg-(--surface-card) rounded-xl border border-(--border-default) shadow-(--shadow-sm) overflow-hidden max-md:rounded-none max-md:border-x-0">
          {children}
        </div>
      </div>
    </Backdrop>
  );
}
