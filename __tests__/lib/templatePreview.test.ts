import { describe, expect, it } from 'vitest';
import { templateToPreviewSchema, templatePreviewSlug } from '@/lib/templatePreview';
import type { Template, FormField } from '@/types/form';

function field(fieldId: string, pageId: string, order: number): FormField {
  return { fieldId, pageId, type: 'short_text', label: fieldId, required: false, deleted: false, order };
}

const BASE: Template = {
  _id: 't1',
  name: 'Job Application',
  description: 'desc',
  category: 'hiring',
  isActive: true,
  settings: { honeypotEnabled: true, layout: 'two_column', successMessage: 'Thanks' },
  fields: [field('a', 'page-1', 0), field('b', 'page-1', 1)],
};

describe('templateToPreviewSchema', () => {
  it('builds one page for a single-page template and titles it with the template name', () => {
    const schema = templateToPreviewSchema(BASE);

    expect(schema.title).toBe('Job Application');
    expect(schema.pages).toEqual([{ id: 'page-1', order: 0, title: 'Job Application' }]);
    expect(schema.fields).toBe(BASE.fields);
  });

  it('preserves a multi-page template by grouping on each field\'s real pageId, in order of appearance', () => {
    const schema = templateToPreviewSchema({
      ...BASE,
      fields: [field('a', 'page-1', 0), field('b', 'page-2', 0), field('c', 'page-1', 1)],
    });

    expect(schema.pages.map((p) => p.id)).toEqual(['page-1', 'page-2']);
    expect(schema.pages.map((p) => p.order)).toEqual([0, 1]);
    expect(schema.pages[1].title).toBeUndefined();
  });

  it('copies layout and success message, and never enables the honeypot in a preview', () => {
    const schema = templateToPreviewSchema(BASE);

    expect(schema.settings.layout).toBe('two_column');
    expect(schema.settings.successMessage).toBe('Thanks');
    expect(schema.settings.honeypotEnabled).toBe(false);
  });

  it('does not throw when the live API omits settings entirely (it did, on every template)', () => {
    const noSettings = { ...BASE, settings: undefined } as unknown as Template;

    const schema = templateToPreviewSchema(noSettings);

    expect(schema.settings.layout).toBeUndefined();
  });

  it('uses neutral branding, not any real form\'s', () => {
    expect(templateToPreviewSchema(BASE).branding).toEqual({});
  });
});

describe('templatePreviewSlug', () => {
  it('is namespaced so a preview draft can never collide with a real published slug', () => {
    expect(templatePreviewSlug('abc')).toBe('template-preview-abc');
  });
});
