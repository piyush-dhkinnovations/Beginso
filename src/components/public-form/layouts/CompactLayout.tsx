import { FormBanner } from '../FormBanner';
import { Backdrop, type LayoutFrameProps } from './shared';

// Compact: two-column (see fieldsClassFor) for dense internal forms. Never two columns on a phone —
// the grid is forced to one column below 768 in fieldsClassFor.
export function CompactLayout({ branding, previewMode, children }: LayoutFrameProps) {
  return (
    <Backdrop previewMode={previewMode}>
      <div className="bg-(--surface-card) rounded-xl border border-(--border-default) shadow-(--shadow-sm) w-full overflow-hidden max-w-170">
        <FormBanner branding={branding} />
        {children}
      </div>
    </Backdrop>
  );
}
