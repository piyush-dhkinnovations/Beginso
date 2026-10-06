import { FormBanner } from '../FormBanner';
import { Backdrop, type LayoutFrameProps } from './shared';

// Classic: one 520px card — the V1 single-column markup, so existing forms render as before.
export function ClassicLayout({ branding, previewMode, children, hideCover }: LayoutFrameProps) {
  return (
    <Backdrop previewMode={previewMode}>
      <div className="bg-(--surface-card) rounded-xl border border-(--border-default) shadow-(--shadow-sm) w-full overflow-hidden max-w-130">
        {!hideCover && <FormBanner branding={branding} />}
        {children}
      </div>
    </Backdrop>
  );
}
