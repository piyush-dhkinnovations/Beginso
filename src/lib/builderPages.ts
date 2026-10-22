import type { FormField, FormPage } from '@/types/form';

/**
 * Every field must point at a page that exists: the server refuses a save in which one does not ("Field pageId ... does not exist in pages").
 * A field that points nowhere (its page was deleted while the field was soft-deleted, or an old save) is moved to the first page. Soft-deleted
 * fields count too: they are still sent, so they are still checked. Returns the same array when nothing needs fixing.
 */
export function repairPageRefs(fields: FormField[], pages: FormPage[]): FormField[] {
  if (pages.length === 0) return fields;
  const ids = new Set(pages.map((p) => p.id));
  const first = [...pages].sort((a, b) => a.order - b.order)[0].id;
  if (fields.every((f) => f.pageId && ids.has(f.pageId))) return fields;
  return fields.map((f) => (f.pageId && ids.has(f.pageId) ? f : ({ ...f, pageId: first } as FormField)));
}
