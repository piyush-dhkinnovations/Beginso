import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TemplateGalleryCard } from '@/components/templates/TemplateGalleryCard';
import type { Template } from '@/types/form';

const tpl = (over: Record<string, unknown> = {}) =>
  ({ _id: 't1', name: 'Job Application', category: 'hr', description: 'Collect CVs', fields: [{}, {}, {}], ...over }) as unknown as Template;

describe('TemplateGalleryCard', () => {
  it('links to the template detail page', () => {
    render(<TemplateGalleryCard template={tpl()} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/discover-templates/t1');
  });

  it('shows name, description and field count (no category badge over the real form preview)', () => {
    render(<TemplateGalleryCard template={tpl()} />);
    expect(screen.getByRole('heading', { name: 'Job Application' })).toBeInTheDocument();
    expect(screen.getByText('Collect CVs')).toBeInTheDocument();
    expect(screen.getByText('3 fields')).toBeInTheDocument();
  });

  it('uses the singular for exactly one field', () => {
    render(<TemplateGalleryCard template={tpl({ fields: [{}] })} />);
    expect(screen.getByText('1 field')).toBeInTheDocument();
  });

  it('falls back to a default description when it is missing or empty', () => {
    render(<TemplateGalleryCard template={tpl({ description: '' })} />);
    expect(screen.getByText('A ready-made starting point you can customize.')).toBeInTheDocument();
  });
});

describe('TemplateGalleryCard — preview and icon', () => {
  it('shows a preview picture and the template colour icon beside its name', () => {
    const { container } = render(<TemplateGalleryCard template={tpl({ name: 'Event Registration', category: 'events' })} />);
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
    expect(container.querySelectorAll('svg[viewBox="0 0 24 24"]').length).toBeGreaterThan(0);
  });

  it('renders without throwing for every category added by the catalog expansion', () => {
    const cats = ['Lead Generation', 'E-commerce', 'Contact us', 'Reservation/Booking', 'Education', 'Real Estate', 'Non-profit', 'Medicine', 'Personal', 'Business', 'Order', 'Working Forms', 'Requests', 'Registration', 'Membership', 'Consent', 'Inspection Forms'];
    for (const category of cats) {
      expect(() => render(<TemplateGalleryCard template={tpl({ category })} />)).not.toThrow();
    }
  });
});
