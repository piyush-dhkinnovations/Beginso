import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { TemplateThumb, thumbVariant } from '@/components/templates/TemplateThumb';
import type { Template } from '@/types/form';

const field = (label: string) => ({ fieldId: label, pageId: 'p', type: 'short_text', label, required: false, deleted: false, order: 0 });
const tpl = (category: string, id = 't1') =>
  ({ _id: id, name: 'Sample', category, description: '', fields: [field('Full name'), field('Email')], settings: {}, isActive: true }) as unknown as Template;

describe('thumbVariant', () => {
  it('gives each known category its own layout', () => {
    const picked = ['general', 'events', 'feedback', 'hr', 'advanced', 'sales'].map((c) => thumbVariant(tpl(c)));
    expect(new Set(picked).size).toBe(6);
  });

  it('is case-insensitive and gives an unknown category a stable pick from its id', () => {
    expect(thumbVariant(tpl('HR'))).toBe('profile');
    expect(thumbVariant(tpl('weird', 'abc'))).toBe(thumbVariant(tpl('weird', 'abc')));
  });
});

describe('TemplateThumb', () => {
  it('draws different markup per category, using the template own question labels', () => {
    const html = ['general', 'events', 'feedback', 'hr', 'advanced', 'sales'].map((c) => render(<TemplateThumb template={tpl(c)} ink="red" surface="pink" />).container.innerHTML);
    expect(new Set(html).size).toBe(6);
    expect(html.filter((h) => h.includes('Full name')).length).toBeGreaterThan(3);
  });

  it('is hidden from assistive tech', () => {
    const { container } = render(<TemplateThumb template={tpl('events')} ink="red" surface="pink" />);
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });
});
