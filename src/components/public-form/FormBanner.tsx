import type { PublicFormBranding } from '@/types/publicForm';

interface FormBannerProps {
  branding: PublicFormBranding;
}

/**
 * 16:9 cover banner + optional overlapping logo. Uses a plain <img> (not
 * next/image) for coverImageUrl/logoUrl — these are arbitrary backend-served
 * upload URLs with no remotePatterns configured, matching the same tradeoff
 * BrandingLivePreview already made in the user builder.
 */
export function FormBanner({ branding }: FormBannerProps) {
  const { coverImageUrl, logoUrl, primaryColor } = branding;

  return (
    <div className="relative w-full aspect-video" style={{ backgroundColor: primaryColor ?? '#1D4ED8' }}>
      {coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary backend-served upload URL, not a static asset
        <img src={coverImageUrl} alt="" className="w-full h-full object-cover" />
      )}
      {logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary backend-served upload URL, not a static asset
        <img
          src={logoUrl}
          alt=""
          className="absolute bottom-[-20px] left-6 w-10 h-10 rounded-full object-cover border-2 border-white shadow-card"
        />
      )}
    </div>
  );
}
