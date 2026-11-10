import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/components/landing/Navbar', () => ({ default: () => null }));
vi.mock('@/components/landing/Footer', () => ({ default: () => null }));
vi.mock('@/components/templates/TemplateGalleryCard', () => ({ TemplateGalleryCard: ({ template }: { template: { title: string } }) => <div>{template.title}</div> }));
vi.mock('@/hooks/useReveal', () => ({ useReveal: () => ({ ref: { current: null }, visible: true }) }));

const mockTemplates = vi.fn();
vi.mock('@/hooks/usePublicTemplates', () => ({ usePublicTemplates: () => mockTemplates() }));

import DiscoverTemplatesPage from '@/app/discover-templates/page';

describe('discover-templates page', () => {
  beforeEach(() => mockTemplates.mockReset());

  it('while loading, reserves the loaded page\'s footprint (sidebar + three rows of cards) so the footer does not jump when cards arrive', () => {
    mockTemplates.mockReturnValue({ data: undefined, isLoading: true, error: null });
    render(<DiscoverTemplatesPage />);
    const skeleton = screen.getByTestId('templates-skeleton');
    expect(skeleton.querySelectorAll('.min-h-85')).toHaveLength(9);
    expect(skeleton.querySelector('.md\\:w-56')).not.toBeNull();
  });

  it('shows the real cards, not the skeleton, once loaded', () => {
    mockTemplates.mockReturnValue({ data: [{ _id: '1', title: 'Hiring', category: 'HR' }], isLoading: false, error: null });
    render(<DiscoverTemplatesPage />);
    expect(screen.queryByTestId('templates-skeleton')).not.toBeInTheDocument();
    expect(screen.getByText('Hiring')).toBeInTheDocument();
  });

  it('lists every category from the fetched templates in the sidebar, each with an icon, and filters on click', async () => {
    mockTemplates.mockReturnValue({
      data: [
        { _id: '1', title: 'Hiring', category: 'HR' },
        { _id: '2', title: 'Donation', category: 'Non-profit' },
      ],
      isLoading: false,
      error: null,
    });
    render(<DiscoverTemplatesPage />);
    const nav = screen.getByRole('navigation', { name: 'Template categories' });
    expect(screen.getByRole('button', { name: /All/ })).toHaveAttribute('aria-pressed', 'true');
    const hrButton = screen.getByRole('button', { name: /HR/ });
    expect(nav.contains(hrButton)).toBe(true);
    expect(hrButton.querySelector('svg')).not.toBeNull();

    await userEvent.click(screen.getByRole('button', { name: /Non-profit/ }));
    expect(screen.getByRole('button', { name: /Non-profit/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Donation')).toBeInTheDocument();
    expect(screen.queryByText('Hiring')).not.toBeInTheDocument();
  });
});
