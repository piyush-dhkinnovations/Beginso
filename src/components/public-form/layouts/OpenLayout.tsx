/* eslint-disable @next/next/no-img-element -- arbitrary backend-served upload URLs, same tradeoff as FormBanner (no remotePatterns configured). */
import { uploadSrc } from '@/lib/uploadSrc';
import { BrandMark, hasBrandMark, logoPx } from '../BrandMark';
import { BannerExtras, hasBannerExtras } from '../BannerExtras';
import { Backdrop, widthClass, type LayoutFrameProps } from './shared';

// Open: no card. The logo, the title and the form's own line of text sit straight on the page, and the questions follow in the same column. The page
// colour or picture is the whole background, so a plain or soft page reads best (the studio's readability list checks the text on it).
export function OpenLayout({ branding, title, previewMode, children, hideCover }: LayoutFrameProps) {
  const { coverImageUrl } = branding;
  const header = !hideCover && (hasBrandMark(branding) || !!title || hasBannerExtras(branding));
  return (
    <Backdrop branding={branding} previewMode={previewMode}>
      <div className={`flex w-full flex-col gap-6 py-2 md:py-6 ${widthClass('open', branding)}`}>
        {!hideCover && coverImageUrl && <img src={uploadSrc(coverImageUrl)} alt="" className="block h-auto w-full rounded-xl" />}
        {header && (
          <header className="flex flex-col gap-3 px-6 md:px-8">
            {hasBrandMark(branding) && <BrandMark branding={branding} size={logoPx(branding)} className="object-contain" />}
            {title && (
              <p aria-hidden="true" className="form-heading font-bold leading-tight text-balance text-(--form-heading)" style={{ fontSize: 'var(--form-headline, 1.75rem)' }}>
                {title}
              </p>
            )}
            <BannerExtras branding={branding} />
          </header>
        )}
        {children}
      </div>
    </Backdrop>
  );
}
