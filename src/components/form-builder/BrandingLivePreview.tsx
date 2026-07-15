'use client';

export interface BrandingLivePreviewProps {
  primaryColor: string;
  logoUrl?: string;
  coverImageUrl?: string;
  formTitle: string;
}

export function BrandingLivePreview({ primaryColor, logoUrl, coverImageUrl, formTitle }: BrandingLivePreviewProps) {
  return (
    <div className="w-[280px] rounded-lg border border-neutral-200 bg-white overflow-hidden shadow-card">
      <div className="w-full aspect-video" style={{ backgroundColor: primaryColor }}>
        {coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary backend-served upload URL, not a static asset
          <img src={coverImageUrl} alt="" className="w-full h-full object-cover" />
        )}
      </div>
      <div className="p-4 flex flex-col gap-3">
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary backend-served upload URL, not a static asset
          <img src={logoUrl} alt="" className="w-8 h-8 rounded object-cover" />
        )}
        <p className="text-body-sm font-semibold text-neutral-800 truncate">{formTitle || 'Untitled form'}</p>
        <button
          type="button"
          disabled
          className="w-full h-[38px] rounded-md text-white text-[13px] font-semibold"
          style={{ backgroundColor: primaryColor }}
        >
          Submit
        </button>
      </div>
    </div>
  );
}
