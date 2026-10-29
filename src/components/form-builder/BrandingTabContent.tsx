'use client';

import { Alert } from '@/components/ui/Alert';
import type { FormBranding, FormSettings, LayoutPreset } from '@/types/form';
import { normaliseLayout, lookBranding } from '@/lib/layoutPresets';
import { BrandingStudio } from './BrandingStudio';
import { LayoutChooser } from './LayoutChooser';

// The Branding tab is one screen: the controls and a large live preview side by side (BrandingStudio), with no layout gallery to get
// through first. Below 1024px detailed branding is desktop-only (CF2.12a): choosing a layout still works on a phone (the tiles are the
// same ones the studio starts with) and the rest is replaced by a plain notice.
export interface BrandingTabContentProps {
  formId?: string;
  formTitle: string;
  branding: FormBranding;
  settings: FormSettings;
  fieldCount: number;
  isPublic: boolean;
  onBrandingUpdate: (updates: Partial<FormBranding>) => void;
  onLayoutChange: (layout: LayoutPreset) => void;
  /** Opens the real form, full size, in a new tab. */
  onFullScreen?: () => void;
  /** Edits the form's title from the Header section. */
  onTitleChange?: (title: string) => void;
}

export function BrandingTabContent({ formId, formTitle, branding, settings, fieldCount, isPublic, onBrandingUpdate, onLayoutChange, onFullScreen, onTitleChange }: BrandingTabContentProps) {
  const layout = normaliseLayout(settings.layout);

  return (
    <>
      <div className="hidden lg:block">
        <BrandingStudio formId={formId} branding={branding} layout={layout} fieldCount={fieldCount} isPublic={isPublic} onBrandingUpdate={onBrandingUpdate} onLayoutChange={onLayoutChange} onFullScreen={onFullScreen} formTitle={formTitle} onTitleChange={onTitleChange} />
      </div>

      <div className="flex flex-col gap-4 lg:hidden">
        <div>
          <h2 className="bg-h4 font-bold text-(--text-primary)">Choose a layout</h2>
          <p className="bg-body-sm text-(--text-muted)">Your fields stay as they are.</p>
        </div>
        <LayoutChooser
          current={layout}
          fieldCount={fieldCount}
          isPublic={isPublic}
          onPick={(next) => {
            onLayoutChange(next);
            onBrandingUpdate(lookBranding(next, branding));
          }}
        />
        <Alert variant="info" title="Detailed branding needs a larger screen">
          Colours, logo and cover are edited on a tablet or desktop. Choosing a layout works here.
        </Alert>
      </div>
    </>
  );
}
