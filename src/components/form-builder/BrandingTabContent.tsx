'use client';

import { useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import type { FormBranding, FormSettings, LayoutPreset } from '@/types/form';
import { normaliseLayout, LAYOUT_PRESETS } from '@/lib/layoutPresets';
import { BrandingPanel } from './BrandingPanel';
import { LayoutGallery } from './LayoutGallery';

// Sprint 13 (CF2.7 / CF2.12). Wireframe: Branding opens on a layout gallery (step 1 of 2), then the
// branding controls (step 2 of 2, with "Change layout"). Below 1024px detailed branding is
// desktop-only (CF2.12a): the gallery still works on a phone (choosing a preset is explicitly in
// scope there) and step 2 is replaced by a plain notice.
export interface BrandingTabContentProps {
  formId?: string;
  formTitle: string;
  branding: FormBranding;
  settings: FormSettings;
  fieldCount: number;
  isPublic: boolean;
  onBrandingUpdate: (updates: Partial<FormBranding>) => void;
  onLayoutChange: (layout: LayoutPreset) => void;
}

export function BrandingTabContent({
  formId,
  formTitle,
  branding,
  settings,
  fieldCount,
  isPublic,
  onBrandingUpdate,
  onLayoutChange,
}: BrandingTabContentProps) {
  const [step, setStep] = useState<'layout' | 'editor'>('layout');
  const preset = LAYOUT_PRESETS.find((p) => p.id === normaliseLayout(settings.layout)) ?? LAYOUT_PRESETS[0];

  return (
    <>
      {/* Step 1 shows always on small screens (step 2 does not exist there) and until skipped on desktop. */}
      <div className={step === 'layout' ? '' : 'lg:hidden'}>
        <LayoutGallery
          formId={formId}
          currentLayout={settings.layout}
          fieldCount={fieldCount}
          isPublic={isPublic}
          onUse={onLayoutChange}
          onSkip={() => setStep('editor')}
        />
      </div>

      {step === 'editor' && (
        <div className="hidden lg:flex lg:flex-col lg:gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button type="button" variant="secondary" onClick={() => setStep('layout')}>
              Change layout
            </Button>
            <span className="bg-body-sm text-(--text-muted)">
              Step 2 of 2 — customising <strong>{preset.name}</strong>
            </span>
          </div>
          <BrandingPanel branding={branding} formTitle={formTitle} onUpdate={onBrandingUpdate} />
        </div>
      )}

      <div className="lg:hidden mt-4">
        <Alert variant="info" title="Detailed branding needs a larger screen">
          Colours, logo and cover are edited on a tablet or desktop. Choosing a layout works here.
        </Alert>
      </div>
    </>
  );
}
