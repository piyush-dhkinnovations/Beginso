import type { PublicFormBranding } from '@/types/publicForm';
import { brandCoverObjectPosition, brandPanelStyle } from '@/lib/formTheme';
import { BrandMark, hasBrandMark, logoPx } from './BrandMark';
import { BannerExtras, hasBannerExtras } from './BannerExtras';
import { uploadSrc } from '@/lib/uploadSrc';

interface FormBannerProps {
  branding: PublicFormBranding;
  /** The form's headline, set large over the banner. Decorative (aria-hidden) — the real <h1> lives in the form body. */
  title?: string;
}

/**
 * Hero banner: the brand panel (solid / gradient / pattern) or the cover image under a scrim, with the logo
 * and the form headline sitting on it. Uses a plain <img> (not next/image) for coverImageUrl/logoUrl — arbitrary
 * backend-served upload URLs with no remotePatterns configured.
 */
export function FormBanner({ branding, title }: FormBannerProps) {
  const { coverImageUrl } = branding;
  const hasMark = hasBrandMark(branding);
  const hasText = !!title || hasMark || hasBannerExtras(branding);

  // 'original': the whole picture at its own size and ratio (never cropped); the logo and headline sit under it.
  if (coverImageUrl && branding.coverFit === 'original') {
    return (
      <div className="w-full">
        {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary backend-served upload URL, not a static asset */}
        <img src={uploadSrc(coverImageUrl)} alt="" className="block h-auto w-full" />
        {hasText && (
          <div className="flex flex-col gap-3 px-6 pt-6 md:px-8">
            <div className="flex items-center gap-3">
              {hasMark && <span className="flex-none"><BrandMark branding={branding} size={logoPx(branding)} className="object-contain" /></span>}
              {title && (
                <p aria-hidden="true" className="font-bold leading-tight text-balance text-(--text-primary)" style={{ fontSize: 'var(--form-headline, 1.75rem)' }}>
                  {title}
                </p>
              )}
            </div>
            <BannerExtras branding={branding} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`relative w-full overflow-hidden ${hasText ? 'min-h-44' : 'aspect-3/1 max-h-56'}`} style={brandPanelStyle(branding)}>
      {coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary backend-served upload URL, not a static asset
        <img src={uploadSrc(coverImageUrl)} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: brandCoverObjectPosition(branding) }} />
      )}
      {coverImageUrl && hasText && <div aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />}
      {hasText && (
        <div className="relative flex h-full min-h-44 flex-col justify-end gap-3 p-6 md:p-8 text-white">
          {hasMark && <BrandMark branding={branding} size={logoPx(branding)} className="object-contain" />}
          {title && (
            <p aria-hidden="true" className="font-bold leading-tight text-balance" style={{ fontSize: 'var(--form-headline, 1.75rem)' }}>
              {title}
            </p>
          )}
          <BannerExtras branding={branding} onDark />
        </div>
      )}
    </div>
  );
}
