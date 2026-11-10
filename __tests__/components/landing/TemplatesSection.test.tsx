/**
 * Landing page "Start from a template": six gallery templates, and a way in when the gallery cannot be shown.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import TemplatesSection from '@/components/landing/TemplatesSection';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
vi.mock('@/hooks/useReveal', () => ({ useReveal: () => ({ ref: { current: null }, visible: true }) }));
vi.mock('@/lib/guest/galleryFilter', () => ({ isGalleryTemplate: () => true }));

const mockTemplates = vi.fn();
vi.mock('@/hooks/usePublicTemplates', () => ({ usePublicTemplates: () => mockTemplates() }));

const template = (n: number) => ({ _id: `t${n}`, name: `Template ${n}`, description: 'A form', fields: [{ deleted: false }, { deleted: true }] });

describe('TemplatesSection', () => {
  beforeEach(() => mockTemplates.mockReset());

  it('shows at most six templates, each opening the guest editor, and a link to the full gallery', () => {
    mockTemplates.mockReturnValue({ data: Array.from({ length: 8 }, (_, i) => template(i + 1)), isLoading: false, isError: false });
    render(<TemplatesSection />);
    expect(screen.getAllByRole('listitem')).toHaveLength(6);
    expect(screen.getByRole('link', { name: /Template 1/ })).toHaveAttribute('href', '/try?template=t1');
    expect(screen.getAllByText('1 questions')).toHaveLength(6);
    expect(screen.getByRole('link', { name: 'Browse all templates' })).toHaveAttribute('href', '/discover-templates');
  });

  it('keeps six placeholders while loading', () => {
    mockTemplates.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    const { container } = render(<TemplatesSection />);
    expect(container.querySelectorAll('li[aria-hidden="true"]')).toHaveLength(6);
    expect(screen.queryByRole('link', { name: 'Browse all templates' })).not.toBeInTheDocument();
  });

  it('says so and offers a blank form when the gallery fails to load, instead of an empty box', () => {
    mockTemplates.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    render(<TemplatesSection />);
    expect(screen.getByText(/Templates could not be loaded right now/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start with a blank form' })).toHaveAttribute('href', '/try');
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('says so when the gallery is empty', () => {
    mockTemplates.mockReturnValue({ data: [], isLoading: false, isError: false });
    render(<TemplatesSection />);
    expect(screen.getByText(/No templates to show yet/)).toBeInTheDocument();
  });
});
