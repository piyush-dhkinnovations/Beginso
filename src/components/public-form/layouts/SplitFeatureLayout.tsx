/* eslint-disable @next/next/no-img-element -- arbitrary backend-served upload URLs, same tradeoff as FormBanner (no remotePatterns configured). */
import { brandPanelStyle } from '@/lib/formTheme';
import { BrandMark, hasBrandMark } from '../BrandMark';
import { BannerExtras } from '../BannerExtras';
import { Backdrop, widthClass, type LayoutFrameProps } from './shared';
import { uploadSrc } from '@/lib/uploadSrc';

// Split Feature: a full-height brand panel beside the form (a real two-pane screen on desktop, not a card on a
// blank page). The panel carries the logo, a large headline and the current step. Below 768 the panel becomes a
// header above the form; below 480 it is hidden entirely (the form title is already inside the form).
export function SplitFeatureLayout({ branding, title, stepNames, currentPage, previewMode, hideCover, children }: LayoutFrameProps) {
  const { coverImageUrl } = branding;
  const stepLabel = stepNames.length > 1 ? stepNames[currentPage] : '';
  return (
    <Backdrop branding={branding} previewMode={previewMode}>
      <div className={`bg-(--surface-card) w-full overflow-hidden md:grid md:grid-cols-5 ${widthClass('split_feature', branding)} md:rounded-2xl md:shadow-xl ${previewMode ? '' : 'md:min-h-[min(46rem,calc(100vh-5rem))]'}`}>
        {/* The panel is decorative, so it comes AFTER the form in DOM order (wireframe a11y note) and is
            moved before it visually: first in the column below 768, left of the form from md up. */}
        <div className="md:col-span-3 md:order-2 md:flex md:flex-col md:justify-center">{children}</div>
        <div
          className="order-first relative flex flex-col justify-between gap-10 p-6 text-white md:order-1 md:col-span-2 md:p-10 max-[480px]:hidden"
          style={brandPanelStyle(branding)}
        >
          {coverImageUrl && !hideCover && (
            <>
              <img src={uploadSrc(coverImageUrl)} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/30 to-black/20" />
            </>
          )}
          <div className="relative">
            {hasBrandMark(branding) && <BrandMark branding={branding} size={48} className="rounded-lg object-contain" />}
          </div>
          <div className="relative flex flex-col gap-3">
            <div aria-hidden="true" className="flex flex-col gap-2">
            {stepLabel && <p className="bg-overline" style={{ color: 'rgba(255,255,255,0.85)' }}>{stepLabel}</p>}
            {title && <p className="font-bold leading-tight text-balance" style={{ fontSize: 'var(--form-headline, 1.75rem)' }}>{title}</p>}
            </div>
            <BannerExtras branding={branding} onDark />
          </div>
        </div>
      </div>
    </Backdrop>
  );
}
