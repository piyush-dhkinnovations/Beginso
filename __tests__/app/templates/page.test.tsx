/**
 * src/app/(user)/templates/page.tsx — the in-app template picker's category filter.
 * Scoped to the collapse/expand behaviour added when the catalog grew to 20 categories (the pill
 * row used to wrap across two or three lines); the rest of the page (search, sort, use template)
 * has no prior coverage and is out of scope for this change.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/components/templates/TemplateCard', () => ({ TemplateCard: ({ template }: { template: { name: string } }) => <div>{template.name}</div> }));
vi.mock('@/components/templates/TemplatePreviewModal', () => ({ TemplatePreviewModal: () => null }));

const mockTemplates = vi.fn();
vi.mock('@/services/templates', () => ({ templatesService: { getTemplates: (...a: unknown[]) => mockTemplates(...a) } }));
vi.mock('@/services/workspaces', () => ({ workspacesService: { list: vi.fn().mockResolvedValue([]) } }));

import TemplatesPage from '@/app/(user)/templates/page';

function template(id: string, category: string) {
  return { _id: id, name: `Template ${id}`, description: '', category, fields: [], settings: {}, isActive: true };
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <TemplatesPage />
    </QueryClientProvider>
  );
}

const MANY_CATEGORIES = [
  'General', 'Advanced', 'Lead Generation', 'E-commerce', 'Feedback', 'HR', 'Events', 'Contact us',
  'Reservation/Booking', 'Education', 'Real Estate', 'Non-profit', 'Medicine', 'Personal', 'Business',
  'Order', 'Working Forms', 'Requests', 'Registration', 'Membership',
];

describe('TemplatesPage category filter', () => {
  beforeEach(() => mockTemplates.mockReset());

  it('collapses a long category list to one row, with the rest behind "View more"', async () => {
    mockTemplates.mockResolvedValue(MANY_CATEGORIES.map((c, i) => template(String(i), c)));
    renderPage();

    const group = await screen.findByRole('group', { name: 'Filter by category' });
    // "All" plus the first five real categories, six pills total, collapsed to one row; the rest are one click away.
    expect(screen.getAllByRole('button', { name: /^(All|General|Advanced|Lead Generation|E-commerce|Feedback)$/ })).toHaveLength(6);
    expect(screen.queryByRole('button', { name: 'HR' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Membership' })).not.toBeInTheDocument();
    const toggle = screen.getByRole('button', { name: /View more/ });
    expect(group.contains(toggle)).toBe(true);

    await userEvent.click(toggle);
    expect(screen.getByRole('button', { name: 'Membership' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show fewer' })).toBeInTheDocument();
  });

  it('does not collapse a short category list, and shows no toggle', async () => {
    mockTemplates.mockResolvedValue([template('1', 'General'), template('2', 'Events')]);
    renderPage();

    expect(await screen.findByRole('button', { name: 'General' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /View more/ })).not.toBeInTheDocument();
  });

  it('keeps the active category visible even when collapsed, after picking one from the overflow', async () => {
    mockTemplates.mockResolvedValue(MANY_CATEGORIES.map((c, i) => template(String(i), c)));
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: /View more/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Membership' }));
    await userEvent.click(screen.getByRole('button', { name: 'Show fewer' }));

    expect(screen.getByRole('button', { name: 'Membership' })).toHaveAttribute('aria-pressed', 'true');
  });
});
