import type { Template, FormPage } from '@/types/form';
import type { PublicFormSchema } from '@/types/publicForm';

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
  const settings = template.settings ?? {};

  return {
    title: template.name,
    pages,
    fields: template.fields,
    branding: {}, // neutral placeholder — this is a preview of the template, not the eventual user's own branding
    settings: {
      honeypotEnabled: false,
      successMessage: settings.successMessage,
      responseLimit: settings.responseLimit,
      closeDate: settings.closeDate,
      layout: settings.layout,
    },
  };
}

/** Draft-storage key PublicFormShell uses for this preview — isolated per template, never collides with a real published form's slug. */
export function templatePreviewSlug(templateId: string): string {
  return `template-preview-${templateId}`;
}
