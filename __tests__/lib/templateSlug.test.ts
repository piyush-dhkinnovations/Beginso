import { describe, it, expect } from 'vitest';
import { templateHref, findTemplateBySlugOrId } from '@/lib/templateSlug';
import type { Template } from '@/types/form';

const tpl = (over: Partial<Template> = {}) =>
  ({ _id: 't1', slug: 'job-application', name: 'Job Application', description: '', category: 'HR', fields: [], settings: {}, isActive: true, ...over }) as Template;

describe('templateHref', () => {
  it('links by slug when the template has one', () => {
    expect(templateHref(tpl())).toBe('/discover-templates/job-application');
  });

  it('falls back to the raw id for a template from a backend that predates slugs', () => {
    expect(templateHref(tpl({ slug: undefined }))).toBe('/discover-templates/t1');
  });
});

describe('findTemplateBySlugOrId', () => {
  const templates = [tpl(), tpl({ _id: 't2', slug: 'exit-interview', name: 'Exit Interview' })];

  it('finds a template by its slug', () => {
    expect(findTemplateBySlugOrId(templates, 'exit-interview')?._id).toBe('t2');
  });

  it('still finds a template by its raw id — an already-shared /discover-templates/<id> link keeps resolving', () => {
    expect(findTemplateBySlugOrId(templates, 't1')?.name).toBe('Job Application');
  });

  it('returns undefined for neither a known slug nor a known id', () => {
    expect(findTemplateBySlugOrId(templates, 'does-not-exist')).toBeUndefined();
  });

  it('returns undefined when the list has not loaded yet', () => {
    expect(findTemplateBySlugOrId(undefined, 'job-application')).toBeUndefined();
  });
});
