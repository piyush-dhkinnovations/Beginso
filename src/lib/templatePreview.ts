import type { Template, FormPage, FormBranding, LayoutPreset, FormSettings } from '@/types/form';
import { suggestFormIcon } from '@/lib/formIcons';
import type { PublicFormSchema } from '@/types/publicForm';

// What a template looks like in its preview: a layout and a branding, by category, so a Contact form, an Event RSVP, a Survey and a
// Job application do not all show the same blue banner. A template that carries its own `branding` (template catalog expansion,
// Nov 2026) uses that for real — the preview then matches exactly what "Use this template" creates. These LOOKS exist only as the
// fallback for a template that predates that field, so it still gets a distinct demo look instead of the builder's bare defaults.
interface TemplateLook {
  layout: LayoutPreset;
  branding: FormBranding;
}

// One look per category, matching the branding actually given to that category's seeded templates
// (Beginso-Backend's seedTemplates.ts) — so a legacy or workspace template with no branding of its
// own still lands in the same visual family as its category's real templates, not an arbitrary one.
const LOOKS: Record<string, TemplateLook> = {
  general: { layout: 'classic', branding: { primaryColor: '#1d4ed8', panelTreatment: 'solid', backgroundStyle: 'wash', cardStyle: 'soft', fontFamily: 'dm_sans', buttonRadius: '8px' } },
  advanced: { layout: 'card_stack', branding: { primaryColor: '#4338ca', panelTreatment: 'pattern', backgroundStyle: 'grid', cardStyle: 'flat', fontFamily: 'lora', buttonStyle: 'outline', buttonRadius: '4px' } },
  'lead generation': { layout: 'compact', branding: { primaryColor: '#4f46e5', fontFamily: 'manrope', panelTreatment: 'gradient', backgroundStyle: 'mesh', cardStyle: 'elevated', buttonRadius: '16px' } },
  'e-commerce': { layout: 'classic', branding: { primaryColor: '#ea580c', fontFamily: 'poppins', panelTreatment: 'solid', backgroundStyle: 'wash', cardStyle: 'soft', buttonRadius: '8px' } },
  feedback: { layout: 'guided', branding: { primaryColor: '#0d9488', fontFamily: 'inter', panelTreatment: 'gradient', backgroundStyle: 'gradient', cardStyle: 'soft', buttonRadius: '16px' } },
  hr: { layout: 'steps', branding: { primaryColor: '#0369a1', fontFamily: 'work_sans', panelTreatment: 'pattern', backgroundStyle: 'dots', cardStyle: 'bordered', buttonRadius: '8px' } },
  events: { layout: 'split_feature', branding: { primaryColor: '#7c3aed', fontFamily: 'nunito', panelTreatment: 'gradient', backgroundStyle: 'mesh', cardStyle: 'elevated', buttonRadius: '16px' } },
  'contact us': { layout: 'classic', branding: { primaryColor: '#2563eb', fontFamily: 'dm_sans', panelTreatment: 'solid', backgroundStyle: 'wash', cardStyle: 'soft', buttonRadius: '8px' } },
  'reservation/booking': { layout: 'compact', branding: { primaryColor: '#e11d48', fontFamily: 'outfit', panelTreatment: 'solid', backgroundStyle: 'wash', cardStyle: 'soft', buttonRadius: '16px' } },
  education: { layout: 'steps', branding: { primaryColor: '#059669', fontFamily: 'space_grotesk', panelTreatment: 'solid', backgroundStyle: 'wash', cardStyle: 'soft', buttonRadius: '8px' } },
  'real estate': { layout: 'classic', branding: { primaryColor: '#b45309', fontFamily: 'merriweather', panelTreatment: 'solid', backgroundStyle: 'wash', cardStyle: 'soft', buttonRadius: '8px' } },
  'non-profit': { layout: 'guided', branding: { primaryColor: '#16a34a', fontFamily: 'quicksand', panelTreatment: 'gradient', backgroundStyle: 'gradient', cardStyle: 'soft', buttonRadius: '16px' } },
  medicine: { layout: 'steps', branding: { primaryColor: '#0891b2', fontFamily: 'inter', panelTreatment: 'solid', backgroundStyle: 'wash', cardStyle: 'bordered', buttonRadius: '8px' } },
  personal: { layout: 'card_stack', branding: { primaryColor: '#9333ea', fontFamily: 'fredoka', panelTreatment: 'gradient', backgroundStyle: 'gradient', cardStyle: 'elevated', buttonRadius: '16px' } },
  sales: { layout: 'compact', branding: { primaryColor: '#ea580c', panelTreatment: 'solid', backgroundStyle: 'plain', cardStyle: 'elevated', fontFamily: 'inter', buttonRadius: '16px' } },
  business: { layout: 'classic', branding: { primaryColor: '#334155', fontFamily: 'inter', panelTreatment: 'solid', backgroundStyle: 'wash', cardStyle: 'soft', buttonRadius: '8px' } },
  order: { layout: 'compact', branding: { primaryColor: '#c2410c', fontFamily: 'poppins', panelTreatment: 'gradient', backgroundStyle: 'wash', cardStyle: 'soft', buttonRadius: '8px' } },
  'working forms': { layout: 'classic', branding: { primaryColor: '#475569', fontFamily: 'work_sans', panelTreatment: 'solid', backgroundStyle: 'plain', cardStyle: 'bordered', buttonRadius: '4px' } },
  requests: { layout: 'guided', branding: { primaryColor: '#7c3aed', fontFamily: 'manrope', panelTreatment: 'pattern', backgroundStyle: 'dots', cardStyle: 'bordered', buttonRadius: '8px' } },
  registration: { layout: 'steps', branding: { primaryColor: '#2563eb', fontFamily: 'outfit', panelTreatment: 'gradient', backgroundStyle: 'mesh', cardStyle: 'elevated', buttonRadius: '16px' } },
  membership: { layout: 'card_stack', branding: { primaryColor: '#a21caf', fontFamily: 'montserrat', panelTreatment: 'gradient', backgroundStyle: 'gradient', cardStyle: 'elevated', buttonRadius: '16px' } },
  consent: { layout: 'classic', branding: { primaryColor: '#0f766e', fontFamily: 'source_serif_4', panelTreatment: 'solid', backgroundStyle: 'plain', cardStyle: 'bordered', buttonRadius: '4px' } },
  'inspection forms': { layout: 'steps', branding: { primaryColor: '#ca8a04', fontFamily: 'space_grotesk', panelTreatment: 'pattern', backgroundStyle: 'grid', cardStyle: 'flat', buttonRadius: '4px' } },
};
const LOOK_ORDER = Object.keys(LOOKS);
const ALIASES: Record<string, string> = {
  event: 'events',
  hiring: 'hr',
  contact: 'sales',
  // Backend casing/spelling has varied across sprints — map every spelling seen in the wild to the real look.
  ecommerce: 'e-commerce',
  'e commerce': 'e-commerce',
  booking: 'reservation/booking',
  reservation: 'reservation/booking',
  nonprofit: 'non-profit',
  'non profit': 'non-profit',
  healthcare: 'medicine',
  health: 'medicine',
};
const MODERN = new Set<string>(['classic', 'card_stack', 'guided', 'steps', 'split_feature', 'compact', 'chat', 'sidebar', 'open', 'focus']);

/** The look for a category; an unknown category gets a stable pick from the template id so it never flips between renders. */
export function templateLook(template: Template): TemplateLook {
  const key = template.category.toLowerCase();
  const known = LOOKS[ALIASES[key] ?? key];
  if (known) return known;
  const sum = [...template._id].reduce((n, c) => n + c.charCodeAt(0), 0);
  return LOOKS[LOOK_ORDER[sum % LOOK_ORDER.length]];
}

/** A template's real branding when it has one, else its category's computed look — the one place this fallback is decided, so the
 * gallery card thumbnail, the detail-page live preview and the eventual created form never disagree on which branding "is" the template's. */
export function effectiveBranding(template: Template): FormBranding {
  return template.branding ?? templateLook(template).branding;
}

// Template has no `pages`/`branding` of its own (see .kiro/specs/public-template-gallery
// design.md "Detail Page") — this derives a synthetic PublicFormSchema for read-only preview
// rendering via PublicFormShell's previewMode. Pages are grouped from whichever distinct
// `pageId` values already exist on the template's fields (preserving a multi-page template's
// structure), not flattened to a single page, since nothing here can assume templates are
// always single-page.
export function templateToPreviewSchema(template: Template): PublicFormSchema {
  const pageIds = Array.from(new Set(template.fields.map((f) => f.pageId)));
  const pages: FormPage[] = pageIds.map((id, index) => ({
    id,
    order: index,
    title: index === 0 ? template.name : undefined,
  }));

  // Backend fixed `settings` being absent on every live template (26 Sep 2026, same day it was
  // found — see docs/backend-contract/api-reference.md), so this default is no longer covering a
  // known-live gap. Kept anyway as defense-in-depth: `template.settings.layout` on an undefined
  // `settings` would throw, and the documented shape has already drifted from reality once.
  const settings: Partial<FormSettings> = template.settings ?? {};
  const look = templateLook(template);
  // A template that names a modern layout itself keeps it; an absent or legacy one (single_column, two_column) takes its category's.
  const layout = settings.layout && MODERN.has(settings.layout) ? settings.layout : look.layout;
  // The template's own branding wins when it has one; only a template that predates it falls back to the computed category look.
  const branding = effectiveBranding(template);

  return {
    title: template.name,
    pages,
    fields: template.fields,
    branding: { ...branding, iconName: branding.iconName ?? suggestFormIcon(template.name)?.name },
    settings: {
      honeypotEnabled: false,
      successMessage: settings.successMessage,
      responseLimit: settings.responseLimit,
      closeDate: settings.closeDate,
      layout,
    },
  };
}

/** Draft-storage key PublicFormShell uses for this preview — isolated per template, never collides with a real published form's slug. */
export function templatePreviewSlug(templateId: string): string {
  return `template-preview-${templateId}`;
}
