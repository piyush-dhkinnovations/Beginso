import type { PublicFormBranding } from '@/types/publicForm';
import { brandCoverObjectPosition } from '@/lib/formTheme';

interface FormBannerProps {
  branding: PublicFormBranding;
}

/**
 * 3:1 cover banner + optional overlapping logo. Uses a plain <img> (not
 * next/image) for coverImageUrl/logoUrl — these are arbitrary backend-served
 * upload URLs with no remotePatterns configured, matching the same tradeoff
 * BrandingLivePreview already made in the user builder.
 */
export function FormBanner({ branding }: FormBannerProps) {
  const { coverImageUrl, logoUrl, primaryColor } = branding;

  return (
    <div className="relative w-full aspect-3/1 max-h-56" style={{ backgroundColor: primaryColor ?? '#1D4ED8' }}>
      {coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary backend-served upload URL, not a static asset
        <img src={coverImageUrl} alt="" className="w-full h-full object-cover" style={{ objectPosition: brandCoverObjectPosition(branding) }} />
      )}
      {logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary backend-served upload URL, not a static asset
        <img
          src={logoUrl}
          alt=""
          className="absolute bottom-[-20px] left-6 w-10 h-10 rounded-full object-cover border-2 border-white shadow-(--shadow-sm)"
        />
      )}
    </div>
  );
}
