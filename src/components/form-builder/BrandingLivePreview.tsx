'use client';

import type { FormBranding } from '@/types/form';
import { brandButtonStyle, brandCoverObjectPosition, brandGapClass } from '@/lib/formTheme';

// Sprint 13 (CF2.3). A miniature of the real public form that reflects EVERY branding control as it changes:
// colour, logo, cover (and where it is cropped), button style and radius, spacing and the progress indicator.
// It renders in the form's own light theme on purpose (CF2.11) — the admin's dark theme must not change how a
// respondent will see it — so it sets explicit colours instead of admin tokens for the sheet itself.
export interface BrandingLivePreviewProps {
  branding: FormBranding;
  formTitle: string;
}

export function BrandingLivePreview({ branding, formTitle }: BrandingLivePreviewProps) {
  const color = branding.primaryColor ?? '#1D4ED8';
  const showProgress = branding.showProgress !== false;
  const button = brandButtonStyle(branding);

  return (
    <div className="w-full max-w-80 rounded-lg border border-(--border-default) overflow-hidden shadow-(--shadow-sm)" style={{ backgroundColor: '#FFFFFF', color: '#111827' }}>
      <div className="relative w-full aspect-video" style={{ backgroundColor: color }}>
        {branding.coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary backend-served upload URL, not a static asset
          <img src={branding.coverImageUrl} alt="" className="w-full h-full object-cover" style={{ objectPosition: brandCoverObjectPosition(branding) }} />
        )}
        {branding.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary backend-served upload URL, not a static asset
          <img src={branding.logoUrl} alt="" className="absolute bottom-[-16px] left-4 w-8 h-8 rounded-full object-cover border-2 border-white shadow-(--shadow-sm)" />
        )}
      </div>
      <div className={`p-4 flex flex-col ${brandGapClass(branding)} ${branding.logoUrl ? 'pt-6' : ''}`}>
        {showProgress && (
          <div aria-hidden="true">
            <div className="flex justify-between text-[11px]" style={{ color: '#6B7280' }}>
              <span>Step 1 of 2</span>
              <span>50%</span>
            </div>
            <div className="mt-1 h-1.5 w-full rounded-full" style={{ backgroundColor: '#E5E7EB' }}>
              <div className="h-full w-1/2 rounded-full" style={{ backgroundColor: color }} />
            </div>
          </div>
        )}
        <p className="text-sm font-semibold truncate">{formTitle || 'Untitled form'}</p>
        <div aria-hidden="true" className="h-8 rounded-md border" style={{ borderColor: '#D1D5DB', backgroundColor: '#F9FAFB' }} />
        <div aria-hidden="true" className="h-8 rounded-md border" style={{ borderColor: '#D1D5DB', backgroundColor: '#F9FAFB' }} />
        <button type="button" disabled className="w-full min-h-11 text-sm font-semibold" style={button}>
          Submit
        </button>
      </div>
    </div>
  );
}
