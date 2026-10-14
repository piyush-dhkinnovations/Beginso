import type { Template, FormPage, FormBranding, LayoutPreset, FormSettings } from '@/types/form';
import { suggestFormIcon } from '@/lib/formIcons';
import type { PublicFormSchema } from '@/types/publicForm';

// What a template looks like in its preview: a layout and a branding, by category, so a Contact form, an Event RSVP, a Survey and a
// Job application do not all show the same blue banner. These describe the DEMO only: the template itself carries no branding, so a
// form created from it starts from the builder's defaults until the owner themes it.
interface TemplateLook {
  layout: LayoutPreset;
  branding: FormBranding;
}

const LOOKS: Record<string, TemplateLook> = {
  general: { layout: 'classic', branding: { primaryColor: '#1d4ed8', panelTreatment: 'solid', backgroundStyle: 'wash', cardStyle: 'soft', fontFamily: 'dm_sans', buttonRadius: '8px' } },
  events: { layout: 'split_feature', branding: { primaryColor: '#7c3aed', panelTreatment: 'gradient', backgroundStyle: 'mesh', cardStyle: 'elevated', fontFamily: 'nunito', buttonRadius: '16px' } },
  feedback: { layout: 'guided', branding: { primaryColor: '#0d9488', panelTreatment: 'gradient', backgroundStyle: 'gradient', cardStyle: 'soft', fontFamily: 'inter', buttonRadius: '16px' } },
  hr: { layout: 'steps', branding: { primaryColor: '#0369a1', panelTreatment: 'pattern', backgroundStyle: 'dots', cardStyle: 'bordered', fontFamily: 'work_sans', buttonRadius: '8px' } },
  advanced: { layout: 'card_stack', branding: { primaryColor: '#4338ca', panelTreatment: 'pattern', backgroundStyle: 'grid', cardStyle: 'flat', fontFamily: 'lora', buttonStyle: 'outline', buttonRadius: '4px' } },
  sales: { layout: 'compact', branding: { primaryColor: '#ea580c', panelTreatment: 'solid', backgroundStyle: 'plain', cardStyle: 'elevated', fontFamily: 'inter', buttonRadius: '16px' } },
};
const LOOK_ORDER = Object.keys(LOOKS);
const ALIASES: Record<string, string> = { event: 'events', hiring: 'hr', contact: 'sales' };
const MODERN = new Set<string>(['classic', 'card_stack', 'guided', 'steps', 'split_feature', 'compact']);

/** The look for a category; an unknown category gets a stable pick from the template id so it never flips between renders. */
export function templateLook(template: Template): TemplateLook {
  const key = template.category.toLowerCase();
  const known = LOOKS[ALIASES[key] ?? key];
  if (known) return known;
  const sum = [...template._id].reduce((n, c) => n + c.charCodeAt(0), 0);
  return LOOKS[LOOK_ORDER[sum % LOOK_ORDER.length]];
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

  return {
    title: template.name,
    pages,
    fields: template.fields,
    branding: { ...look.branding, iconName: suggestFormIcon(template.name)?.name }, // a demo look per category, not the eventual user's own branding
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
