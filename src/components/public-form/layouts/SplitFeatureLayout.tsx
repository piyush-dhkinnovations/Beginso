/* eslint-disable @next/next/no-img-element -- arbitrary backend-served upload URLs, same tradeoff as FormBanner (no remotePatterns configured). */
import { useEffect, useRef } from 'react';
import { brandPanelStyle } from '@/lib/formTheme';
import { BrandMark, hasBrandMark, logoPx } from '../BrandMark';
import { BannerExtras } from '../BannerExtras';
import { Backdrop, widthClass, type LayoutFrameProps } from './shared';
import { uploadSrc } from '@/lib/uploadSrc';

// Split Feature: a full-height brand panel beside the form (a real two-pane screen on desktop, not a card on a
// blank page). The panel carries the logo, a large headline and the current step. From 768 up, on a page of its own
// (`fitScreen`), the whole card stays inside the screen with the page's margin above and below it and the form scrolls
// inside the card, so the picture is not blown up to the form's height. Where the card cannot be held to the screen (an
// embed that grows to its content), the panel's picture stays no taller than the screen and in view (the card clips with
// `overflow-clip`, which unlike `hidden` leaves `sticky` working). Below 768 the panel becomes a header above the form;
// below 480 it is hidden entirely (the form title is already inside the form).
export function SplitFeatureLayout({ branding, title, stepNames, currentPage, previewMode, hideCover, fitScreen, children }: LayoutFrameProps) {
  const { coverImageUrl } = branding;
  const stepLabel = stepNames.length > 1 ? stepNames[currentPage] : '';
  const wordsOnTop = branding.theme?.layout?.panelText === 'top';
  // A new page of the form starts at its top, also where the form scrolls inside the card.
  const formColumn = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (formColumn.current) formColumn.current.scrollTop = 0;
  }, [currentPage]);
  return (
    <Backdrop branding={branding} previewMode={previewMode}>
      <div className={`form-card bg-(--surface-card) w-full overflow-clip flex flex-col md:grid md:grid-cols-5 ${widthClass('split_feature', branding)} md:rounded-2xl md:shadow-xl ${previewMode ? '' : 'md:min-h-[min(46rem,calc(100vh-5rem))]'} ${fitScreen ? 'md:max-h-[calc(100dvh-5rem)] md:grid-rows-[minmax(0,1fr)]' : ''}`}>
        {/* The panel is decorative, so it comes AFTER the form in DOM order (wireframe a11y note) and is
            moved before it visually: first in the column below 768, left of the form from md up. */}
        {/* `justify-center-safe`: centred while it fits, and from the top (never cut off) once it has to scroll. */}
        <div ref={formColumn} className={`split-form md:col-span-3 md:order-2 md:flex md:flex-col md:justify-center-safe ${fitScreen ? 'md:min-h-0 md:overflow-y-auto' : ''}`}>
          {children}
        </div>
        <div className="split-panel order-first relative text-white md:order-1 md:col-span-2 max-[480px]:hidden" style={brandPanelStyle(branding)}>
          <div
            className={`relative flex h-full flex-col gap-10 p-6 md:sticky md:top-0 md:max-h-[min(100dvh,90rem)] md:p-10 ${wordsOnTop ? 'justify-start' : 'justify-between'}`}
          >
            {coverImageUrl && !hideCover && (
              <>
                <img src={uploadSrc(coverImageUrl)} alt="" className="absolute inset-0 w-full h-full object-cover" />
                {/* darkest behind the words, so white text stays readable on any picture */}
                <div className={`absolute inset-0 ${wordsOnTop ? 'bg-linear-to-b' : 'bg-linear-to-t'} from-black/70 via-black/30 to-black/20`} />
              </>
            )}
            {/* At the bottom, this box (empty without a logo) is what pushes the words down. */}
            {(!wordsOnTop || hasBrandMark(branding)) && (
              <div className="relative">
                {hasBrandMark(branding) && <BrandMark branding={branding} size={logoPx(branding)} className="object-contain" />}
              </div>
            )}
            <div className="relative flex flex-col gap-3">
              <div aria-hidden="true" className="flex flex-col gap-2">
                {stepLabel && <p className="bg-overline" style={{ color: 'rgba(255,255,255,0.85)' }}>{stepLabel}</p>}
                {title && <p className="form-heading font-bold leading-tight text-balance" style={{ fontSize: 'var(--form-headline, 1.75rem)', color: 'var(--form-heading-header, inherit)' }}>{title}</p>}
              </div>
              <BannerExtras branding={branding} onDark />
            </div>
          </div>
        </div>
      </div>
    </Backdrop>
  );
}
