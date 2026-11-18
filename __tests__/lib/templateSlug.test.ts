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

describe('a renamed template (old slug)', () => {
  const list = [tpl({ _id: 'a', slug: 'contact-us', replaces: ['general-contact-form'] }), tpl({ _id: 'b', slug: 'waitlist', replaces: ['product-waitlist'] }), tpl({ _id: 'c', slug: 'job-application' })];

  it('is found by the old slug, as the template that replaced it', async () => {
    const { findTemplateBySlugOrId } = await import('@/lib/templateSlug');
    expect(findTemplateBySlugOrId(list, 'general-contact-form')?._id).toBe('a');
    expect(findTemplateBySlugOrId(list, 'product-waitlist')?._id).toBe('b');
    expect(findTemplateBySlugOrId(list, 'contact-us')?._id).toBe('a');
    expect(findTemplateBySlugOrId(list, 'nothing-like-it')).toBeUndefined();
  });

  it('says where an old slug now lives, and nothing for a current slug, an id or an unknown one', async () => {
    const { renamedTo } = await import('@/lib/templateSlug');
    expect(renamedTo(list, 'general-contact-form')).toBe('contact-us');
    expect(renamedTo(list, 'contact-us')).toBeUndefined();
    expect(renamedTo(list, 'a')).toBeUndefined();
    expect(renamedTo(list, 'nothing-like-it')).toBeUndefined();
    expect(renamedTo(undefined, 'general-contact-form')).toBeUndefined();
  });

  it('a current slug wins over an old one: a template still called by that name is shown, not redirected', async () => {
    const { findTemplateBySlugOrId, renamedTo } = await import('@/lib/templateSlug');
    const both = [tpl({ _id: 'x', slug: 'waitlist', replaces: ['product-waitlist'] }), tpl({ _id: 'y', slug: 'product-waitlist' })];
    expect(findTemplateBySlugOrId(both, 'product-waitlist')?._id).toBe('y');
    expect(renamedTo(both, 'product-waitlist')).toBeUndefined();
  });
});
