'use client';

import type { ComponentType } from 'react';
import { Button } from '@/components/ui/Button';
import type { Template, LayoutPreset } from '@/types/form';
import { templateToPreviewSchema } from '@/lib/templatePreview';
import { brandButtonStyle } from '@/lib/formTheme';
import { normaliseLayout } from '@/lib/layoutPresets';
import { fieldsClassFor, isOneAtATime, type LayoutFrameProps } from '@/components/public-form/layouts';
import { ClassicLayout } from '@/components/public-form/layouts/ClassicLayout';
import { CardStackLayout } from '@/components/public-form/layouts/CardStackLayout';
import { GuidedLayout } from '@/components/public-form/layouts/GuidedLayout';
import { StepsLayout } from '@/components/public-form/layouts/StepsLayout';
import { SplitFeatureLayout } from '@/components/public-form/layouts/SplitFeatureLayout';
import { CompactLayout } from '@/components/public-form/layouts/CompactLayout';
import { ChatLayout } from '@/components/public-form/layouts/ChatLayout';
import { SidebarLayout } from '@/components/public-form/layouts/SidebarLayout';
import { OpenLayout } from '@/components/public-form/layouts/OpenLayout';
import { FocusLayout } from '@/components/public-form/layouts/FocusLayout';
import { TemplateFormSheet } from '@/components/templates/TemplateFormSheet';
import { useWidth } from '@/components/ui/charts/useWidth';

// The picture on a template card: the REAL layout component the public form itself uses (components/public-form/layouts),
// drawn at a representative desktop width and shrunk to fit the card with a measured CSS scale — not a hand-approximated
// shape. A Split Feature template's card shows the same side panel the real form shows; a Steps template shows the same
// step strip. The card and "Use this template" can never show two different structures again, because this is the one
// structure: same component, same branding, just smaller. Only the surrounding chrome (RHF state, submit, validation) is
// left out — this is read-only and nothing here is ever submitted.
//
// Imported directly, NOT through layouts/index.ts's LAYOUT_COMPONENTS (which code-splits 9 of the 10 via next/dynamic):
// a gallery page shows many different layouts on screen at once, so splitting buys nothing here and costs a real one —
// next/dynamic resolves as `null` outside Next's own runtime (every layout but Classic rendered as a blank box in tests,
// and flashed blank-then-popped-in on first paint in the browser). Every one of these ten files is a small, static,
// side-effect-free presentational component (see shared.tsx's own contract comment), so bundling them plainly is cheap.
const LAYOUTS: Record<LayoutPreset, ComponentType<LayoutFrameProps>> = {
  classic: ClassicLayout,
  card_stack: CardStackLayout,
  guided: GuidedLayout,
  steps: StepsLayout,
  split_feature: SplitFeatureLayout,
  compact: CompactLayout,
  chat: ChatLayout,
  sidebar: SidebarLayout,
  open: OpenLayout,
  focus: FocusLayout,
};

// A virtual desktop stage every template is drawn at before being shrunk to fit the card — wide enough that a Split
// Feature or Sidebar template's md: side panel renders the way a desktop respondent actually sees it. The card's own
// aspect ratio is fixed to this same W:H, so the measured width-only scale fills it exactly, no cropping, no gap.
// 800 x 500 (a 16:10 card): narrower than a desktop, but still wide enough for a Split Feature or Sidebar template's side panel (it appears from 768 px).
// The form is drawn about a third larger than it was at 1040, and only the TOP of it is shown (the title, the first questions), cropped by the card.
const STAGE_WIDTH = 800;
const STAGE_HEIGHT = 500;
export const THUMB_ASPECT = `${STAGE_WIDTH}/${STAGE_HEIGHT}`;

export function TemplateThumb({ template }: { template: Template }) {
  const schema = templateToPreviewSchema(template);
  // templateToPreviewSchema() only ever writes a real LayoutPreset here (never a legacy value) — normaliseLayout is the
  // single source of truth for that mapping elsewhere in the app, reused here rather than re-asserting the type.
  const layout = normaliseLayout(schema.settings.layout);
  const LayoutFrame = LAYOUTS[layout];
  const stepNames = schema.pages.map((p) => p.title ?? '');
  const oneAtATime = isOneAtATime(layout);
  const fields = schema.fields.filter((f) => !f.deleted);
  const shown = oneAtATime ? fields.slice(0, 1) : fields.slice(0, 3);
  const buttonStyle = brandButtonStyle(schema.branding);
  // A card shows the TOP of the form: its title and first questions. A template whose cover is set to "show the whole picture" would fill the whole
  // card with a photo (or a plain colour when the photo is dark or missing) and hide the form, so the card always draws the cover as a banner strip.
  const branding = { ...schema.branding, coverFit: 'banner' as const };

  // Measured, not assumed: the card's real rendered width varies by grid column count and viewport, so the scale factor
  // is read back from the frame itself (same technique LiveFormPreview.tsx already uses for the Branding studio's preview).
  const [frameRef, frameWidth] = useWidth(0);
  const scale = frameWidth > 0 ? frameWidth / STAGE_WIDTH : 0;

  // A light backdrop in the template's own colour and a hairline edge, so a form on a plain page (a white card on a white page) still reads as a card
  // instead of a blank box. The brand colour is a hex the backend validated; anything else falls back to a neutral tint.
  const brand = typeof schema.branding.primaryColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(schema.branding.primaryColor) ? schema.branding.primaryColor : '#64748b';
  const backdrop = `color-mix(in srgb, ${brand} 12%, #f8fafc)`;

  return (
    <div
      ref={frameRef}
      role="img"
      aria-label={`Preview of the ${template.name} form`}
      // the light scope: a picture of a form is drawn the way the form really looks, never in the viewer's dark theme
      data-theme="light"
      className="relative w-full overflow-hidden border-b border-(--border-default)"
      style={{ aspectRatio: THUMB_ASPECT, backgroundColor: backdrop }}
    >
      {scale > 0 && (
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT, transform: `scale(${scale})`, pointerEvents: 'none' }}
          // a picture, not a form: nothing in it can be focused or read out as a field
          inert
        >
          <LayoutFrame
            layout={layout}
            branding={branding}
            title={schema.title}
            previewMode
            stepNames={stepNames}
            currentPage={0}
            question={oneAtATime ? { current: 1, total: fields.length } : undefined}
          >
            {/* Same padding the real <form> body carries (PublicFormShell.tsx) — without it every field and the
                button sit flush against the card's own edge, unlike the real form. */}
            <div className="p-6 md:p-8">
              <div className={fieldsClassFor(layout, schema.branding.spacing, schema.branding.fieldGrouping)}>
                <TemplateFormSheet fields={shown} />
              </div>
              <div className="form-btn-row mt-6 flex gap-3">
                <Button type="button" className="form-btn flex-1" style={buttonStyle}>
                  Continue
                </Button>
              </div>
            </div>
          </LayoutFrame>
        </div>
      )}
    </div>
  );
}
