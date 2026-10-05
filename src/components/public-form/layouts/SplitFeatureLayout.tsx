/* eslint-disable @next/next/no-img-element -- arbitrary backend-served upload URLs, same tradeoff as FormBanner (no remotePatterns configured). */
import { Backdrop, DEFAULT_PRIMARY, type LayoutFrameProps } from './shared';

// Split Feature: brand panel beside the form. Below 768 the panel becomes a header above the form;
// below 480 it is hidden entirely (the form title is already inside the form).
export function SplitFeatureLayout({ branding, title, previewMode, children }: LayoutFrameProps) {
  const { primaryColor = DEFAULT_PRIMARY, coverImageUrl, logoUrl } = branding;
  return (
    <Backdrop previewMode={previewMode}>
      <div className="bg-(--surface-card) rounded-xl border border-(--border-default) shadow-(--shadow-sm) w-full overflow-hidden max-w-240 md:grid md:grid-cols-5">
        {/* The panel is decorative, so it comes AFTER the form in DOM order (wireframe a11y note) and is
            moved before it visually: first in the column below 768, left of the form from md up. */}
        <div className="md:col-span-3 md:order-2">{children}</div>
        <div
          aria-hidden="true"
          className="order-first relative flex flex-col justify-end gap-3 p-6 text-white md:order-1 md:col-span-2 md:min-h-96 max-[480px]:hidden"
          style={{ backgroundColor: primaryColor }}
        >
          {coverImageUrl && (
            <img src={coverImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
          )}
          <div className="relative flex items-center gap-3">
            {logoUrl && <img src={logoUrl} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-white" />}
            <p className="bg-h5 font-bold">{title}</p>
          </div>
        </div>
      </div>
    </Backdrop>
  );
}
