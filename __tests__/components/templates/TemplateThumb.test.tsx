import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TemplateThumb } from '@/components/templates/TemplateThumb';
import type { Template } from '@/types/form';

const field = (label: string) => ({ fieldId: label, pageId: 'p', type: 'short_text' as const, label, required: false, deleted: false, order: 0 });
const tpl = (over: Partial<Template> = {}) =>
  ({
    _id: 't1',
    name: 'Sample',
    category: 'hr',
    description: '',
    fields: [field('Full name'), field('Email')],
    settings: {},
    isActive: true,
    ...over,
  }) as unknown as Template;

describe('TemplateThumb', () => {
  it('is one picture with an accessible name, and nothing inside it can be focused', () => {
    const { container } = render(<TemplateThumb template={tpl()} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveAttribute('role', 'img');
    expect(root.getAttribute('aria-label')).toMatch(/^Preview of the .+ form$/);
    // the drawn form is inert: a tab key or a screen reader never lands on its fields
    expect(root.querySelector('[inert]')).not.toBeNull();
  });

  it("shows the template's own real question labels and a call to action, using the real field renderer", () => {
    render(<TemplateThumb template={tpl()} />);
    expect(screen.getByText('Full name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Continue')).toBeInTheDocument();
  });

  it('draws the REAL Split Feature structure (a side panel) for a template using that layout, not a generic card', () => {
    const { container } = render(<TemplateThumb template={tpl({ settings: { layout: 'split_feature', honeypotEnabled: false } })} />);
    // SplitFeatureLayout.tsx's own class names — proves the real layout component rendered, not an approximation of it.
    expect(container.querySelector('.split-panel')).not.toBeNull();
    expect(container.querySelector('.split-form')).not.toBeNull();
  });

  it('draws the REAL Steps structure (a step strip) for a multi-page template using that layout', () => {
    const fields = [
      { fieldId: 'a', pageId: 'page-1', type: 'short_text' as const, label: 'First', required: false, deleted: false, order: 0 },
      { fieldId: 'b', pageId: 'page-2', type: 'short_text' as const, label: 'Second', required: false, deleted: false, order: 1 },
    ];
    render(<TemplateThumb template={tpl({ fields, settings: { layout: 'steps', honeypotEnabled: false } })} />);
    // Stepper.tsx renders an <ol aria-label="Form steps">, not a <nav> — this is the real Stepper component, not an approximation.
    expect(screen.getByLabelText('Form steps')).toBeInTheDocument();
  });

  it('shows only one question for a one-at-a-time layout (Guided), matching what the real form actually shows', () => {
    render(
      <TemplateThumb
        template={tpl({ fields: [field('First'), field('Second'), field('Third')], settings: { layout: 'guided', honeypotEnabled: false } })}
      />
    );
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.queryByText('Second')).not.toBeInTheDocument();
  });

  it('two templates with genuinely different layouts render different markup — not the same shape in a different colour', () => {
    const a = render(<TemplateThumb template={tpl({ settings: { layout: 'classic', honeypotEnabled: false } })} />).container.innerHTML;
    const b = render(<TemplateThumb template={tpl({ settings: { layout: 'split_feature', honeypotEnabled: false } })} />).container.innerHTML;
    expect(a).not.toBe(b);
  });

  it('a real cover photo on the branding shows as a real image', () => {
    const { container } = render(
      <TemplateThumb template={tpl({ branding: { coverImageUrl: 'https://images.unsplash.com/photo-123' } })} />
    );
    expect(container.querySelector('img[alt=""]')).toHaveAttribute('src', expect.stringContaining('images.unsplash.com'));
  });
});

describe('TemplateThumb: a cover photo never hides the form', () => {
  const withCover = (coverFit: 'original' | 'banner') =>
    tpl({ branding: { coverImageUrl: '/form-pictures/sand-dunes.jpg', coverFit, primaryColor: '#92400E' } as never });

  it('draws a "whole picture" cover as a banner strip, so the title and the first questions still show', () => {
    const { container } = render(<TemplateThumb template={withCover('original')} />);
    const img = container.querySelector('img') as HTMLImageElement;
    expect(img).not.toBeNull();
    expect(img.className).toContain('absolute'); // cropped to the strip
    expect(img.className).not.toContain('h-auto'); // not the picture at its own full height
    expect(screen.getByText('Full name')).toBeInTheDocument();
  });

  it('leaves a banner cover as it was', () => {
    const { container } = render(<TemplateThumb template={withCover('banner')} />);
    expect((container.querySelector('img') as HTMLImageElement).className).toContain('absolute');
  });
});
