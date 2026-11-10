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
const STAGE_WIDTH = 1040;
const STAGE_HEIGHT = 600;
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

  // Measured, not assumed: the card's real rendered width varies by grid column count and viewport, so the scale factor
  // is read back from the frame itself (same technique LiveFormPreview.tsx already uses for the Branding studio's preview).
  const [frameRef, frameWidth] = useWidth(0);
  const scale = frameWidth > 0 ? frameWidth / STAGE_WIDTH : 0;

  return (
    <div ref={frameRef} aria-hidden="true" className="relative w-full overflow-hidden" style={{ aspectRatio: THUMB_ASPECT }}>
      {scale > 0 && (
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT, transform: `scale(${scale})`, pointerEvents: 'none' }}
        >
          <LayoutFrame
            layout={layout}
            branding={schema.branding}
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
