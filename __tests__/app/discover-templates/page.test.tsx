import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/components/landing/Navbar', () => ({ default: () => null }));
vi.mock('@/components/landing/Footer', () => ({ default: () => null }));
vi.mock('@/components/templates/TemplateGalleryCard', () => ({ TemplateGalleryCard: ({ template }: { template: { title: string } }) => <div>{template.title}</div> }));
vi.mock('@/hooks/useReveal', () => ({ useReveal: () => ({ ref: { current: null }, visible: true }) }));

const mockTemplates = vi.fn();
vi.mock('@/hooks/usePublicTemplates', () => ({ usePublicTemplates: () => mockTemplates() }));

import DiscoverTemplatesPage from '@/app/discover-templates/page';

describe('discover-templates page', () => {
  beforeEach(() => mockTemplates.mockReset());

  it('while loading, reserves the loaded page\'s footprint (category row + three rows of cards) so the footer does not jump when cards arrive', () => {
    mockTemplates.mockReturnValue({ data: undefined, isLoading: true, error: null });
    render(<DiscoverTemplatesPage />);
    const skeleton = screen.getByTestId('templates-skeleton');
    expect(skeleton.querySelectorAll('.min-h-85')).toHaveLength(9);
    expect(skeleton.querySelector('.h-9.mb-14')).not.toBeNull();
  });

  it('shows the real cards, not the skeleton, once loaded', () => {
    mockTemplates.mockReturnValue({ data: [{ _id: '1', title: 'Hiring', category: 'HR' }], isLoading: false, error: null });
    render(<DiscoverTemplatesPage />);
    expect(screen.queryByTestId('templates-skeleton')).not.toBeInTheDocument();
    expect(screen.getByText('Hiring')).toBeInTheDocument();
  });
});
