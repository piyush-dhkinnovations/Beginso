import type { Template } from '@/types/form';

/** The gallery card's and detail page's own link: the readable slug when the template has one
 *  (every template from a current backend does), the raw id otherwise — never broken, never the
 *  only option once a slug exists. */
export function templateHref(template: Pick<Template, '_id' | 'slug'>): string {
  return `/discover-templates/${template.slug || template._id}`;
}

/** Finds a template by its slug OR its raw id, so an already-shared or bookmarked
 *  /discover-templates/<24-hex-id> link keeps resolving after the gallery switches to slugs. */
export function findTemplateBySlugOrId(templates: Template[] | undefined, param: string): Template | undefined {
  // then an OLD slug of a renamed template (general-contact-form is now contact-us): the template that replaced it
  return templates?.find((t) => t.slug === param || t._id === param) ?? templates?.find((t) => t.replaces?.includes(param));
}

/** When  is the OLD slug of a renamed template: the slug it is now called, so the page can send the visitor on to it. Otherwise undefined. */
export function renamedTo(templates: Template[] | undefined, param: string): string | undefined {
  if (!templates || templates.some((t) => t.slug === param || t._id === param)) return undefined;
  return templates.find((t) => t.replaces?.includes(param))?.slug;
}
