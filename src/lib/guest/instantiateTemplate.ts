import type { FormField, FormPage, FormSettings, LogicRule } from '@/types/form';

// The client-side twin of the backend's POST /api/templates/:id/use: a guest cannot call that, so the
// copy-with-fresh-ids happens here. Every fieldId and pageId is regenerated and every conditional-logic
// reference (the source `condition.fieldId` and the `targetFieldId`) is pointed at the NEW ids.

/** What GET /api/templates/public returns. Fields may carry a Mongo `_id` instead of a `fieldId`; `pages` may be absent. */
export interface TemplateInput {
  name: string;
  fields: (Omit<FormField, 'fieldId' | 'pageId'> & { fieldId?: string; pageId?: string; _id?: string })[];
  pages?: FormPage[];
  settings?: FormSettings;
}

export interface InstantiatedTemplate {
  title: string;
  fields: FormField[];
  pages: FormPage[];
  settings: FormSettings;
}

export function instantiateTemplate(template: TemplateInput, newId: () => string = () => crypto.randomUUID()): InstantiatedTemplate {
  const sourcePages = template.pages?.length ? template.pages : [{ id: '__default', order: 0 }];
  const pageIds = new Map(sourcePages.map((p) => [p.id, newId()]));
  const pages: FormPage[] = sourcePages.map((p) => ({ ...p, id: pageIds.get(p.id)! }));
  const firstPage = pages[0].id;

  const fieldIds = new Map<string, string>();
  for (const f of template.fields) {
    const old = f.fieldId ?? f._id;
    if (old) fieldIds.set(old, newId());
  }

  const fields = template.fields.map((raw) => {
    const { _id, ...f } = raw;
    const old = f.fieldId ?? _id;
    const logicRules: LogicRule[] | undefined = f.logicRules?.map((rule) => ({
      ...rule,
      targetFieldId: fieldIds.get(rule.targetFieldId) ?? rule.targetFieldId,
      condition: { ...rule.condition, fieldId: fieldIds.get(rule.condition.fieldId) ?? rule.condition.fieldId },
    }));
    return {
      ...f,
      fieldId: (old && fieldIds.get(old)) || newId(),
      pageId: (f.pageId && pageIds.get(f.pageId)) || firstPage,
      deleted: f.deleted ?? false,
      ...(logicRules ? { logicRules } : {}),
    } as FormField;
  });

  return { title: template.name, fields, pages, settings: { honeypotEnabled: true, ...template.settings } };
}
