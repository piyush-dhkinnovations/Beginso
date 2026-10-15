import type { FormBranding, FormField, FormPage, FormSettings } from '@/types/form';
import type { PublicFormSchema } from '@/types/publicForm';

/** The builder's state as the respondent renderer expects it (same shaping as the saved-form preview route). */
export function toPublicSchema(s: { title: string; pages: FormPage[]; fields: FormField[]; branding: FormBranding; settings: FormSettings }): PublicFormSchema {
  return {
    title: s.title,
    pages: [...s.pages].sort((a, b) => a.order - b.order),
    fields: s.fields.filter((f) => !f.deleted).sort((a, b) => a.order - b.order),
    branding: s.branding,
    settings: {
      honeypotEnabled: s.settings.honeypotEnabled,
      successMessage: s.settings.successMessage,
      layout: s.settings.layout,
      accessMode: s.settings.accessMode,
    },
  };
}
