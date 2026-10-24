import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FormDataHeader } from '@/components/forms/FormDataHeader';
import { makeForm } from './formsTestUtils';

const nav = vi.hoisted(() => ({ pathname: '/forms/f1/inbox', ws: null as string | null, push: vi.fn() }));
const getFormById = vi.hoisted(() => vi.fn());
const scope = vi.hoisted(() => ({ value: 'personal' as string | undefined }));

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'f1' }),
  usePathname: () => nav.pathname,
  useRouter: () => ({ push: nav.push }),
  useSearchParams: () => ({ get: (k: string) => (k === 'ws' ? nav.ws : null) }),
}));
vi.mock('@/hooks/useFormScope', () => ({ useFormScope: () => scope.value }));
vi.mock('@/services/forms', () => ({ formsService: { getFormById: (...a: unknown[]) => getFormById(...a) } }));

function renderHeader() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <FormDataHeader />
    </QueryClientProvider>
  );
}

describe('FormDataHeader', () => {
  beforeEach(() => {
    nav.pathname = '/forms/f1/inbox';
    nav.ws = null;
    nav.push.mockReset();
    getFormById.mockReset();
    getFormById.mockResolvedValue(makeForm({ title: 'Survey', status: 'published' }));
    scope.value = 'personal';
  });

  it.each(['/forms/f1/overview', '/forms/f1/edit', '/forms', '/forms/f1/inbox/extra'])('renders nothing and does not fetch on %s', (path) => {
    nav.pathname = path;
    const { container } = renderHeader();
    expect(container).toBeEmptyDOMElement();
    expect(getFormById).not.toHaveBeenCalled();
  });

  it('shows the form title, status and a breadcrumb back to Responses', async () => {
    renderHeader();
    expect(await screen.findByRole('heading', { name: 'Survey' })).toBeInTheDocument();
    expect(screen.getByText('Published')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Responses' })).toHaveAttribute('href', '/form-responses');
  });

  it('shows a placeholder title until the form loads', () => {
    getFormById.mockReturnValue(new Promise(() => {}));
    renderHeader();
    expect(screen.getByRole('heading', { name: '…' })).toBeInTheDocument();
  });

  it('has the Insights / Responses switch in its second row on both pages, with the current one marked (trailing slash tolerated)', async () => {
    const { unmount } = renderHeader();
    await screen.findByRole('heading', { name: 'Survey' });
    expect(screen.getByRole('button', { name: 'Responses' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Insights' })).toHaveAttribute('aria-pressed', 'false');
    unmount();

    nav.pathname = '/forms/f1/insights/';
    renderHeader();
    await screen.findByRole('heading', { name: 'Survey' });
    expect(screen.getByRole('button', { name: 'Insights' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Responses' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('is two compact rows: the title in the breadcrumb line with the status, then the switch with a place for the controls of the page', async () => {
    const { container } = renderHeader();
    const title = await screen.findByRole('heading', { name: 'Survey' });
    const row1 = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(row1).toContainElement(title); // the title is the last crumb, not a big heading of its own
    expect(screen.getByText('Published')).toBeInTheDocument();
    expect(container.querySelector('#form-data-header-slot')).not.toBeNull(); // Export
    expect(container.querySelector('#form-data-header-end-slot')).not.toBeNull(); // Customize
    expect(container.querySelector('#form-data-subheader-slot')).not.toBeNull(); // count and view buttons, or Filters and Add chart
    expect(screen.getByRole('link', { name: 'Edit form' })).toHaveTextContent('Edit');
  });

  it('on Insights, switching view navigates to the Responses page', async () => {
    nav.pathname = '/forms/f1/insights';
    renderHeader();
    await screen.findByRole('heading', { name: 'Survey' });
    await userEvent.click(screen.getByText('Responses', { selector: 'button, button *' }));
    expect(nav.push).toHaveBeenCalledWith('/forms/f1/inbox');
  });

  it('keeps the workspace in links and navigation (from ?ws=)', async () => {
    nav.ws = 'acme';
    renderHeader();
    await screen.findByRole('heading', { name: 'Survey' });
    expect(screen.getByRole('link', { name: 'Responses' })).toHaveAttribute('href', '/w/acme/form-responses');
    expect(screen.getByRole('link', { name: /Edit form/ })).toHaveAttribute('href', '/forms/f1/edit?ws=acme');
  });

  it('falls back to the resolved form scope when there is no ?ws=', async () => {
    scope.value = 'team-x';
    renderHeader();
    await screen.findByRole('heading', { name: 'Survey' });
    expect(screen.getByRole('link', { name: /Edit form/ })).toHaveAttribute('href', '/forms/f1/edit?ws=team-x');
  });

  it('hides Edit form from roles without forms:edit', async () => {
    getFormById.mockResolvedValue(makeForm({ title: 'Survey', myRole: 'viewer' }));
    renderHeader();
    await screen.findByRole('heading', { name: 'Survey' });
    await waitFor(() => expect(screen.queryByRole('link', { name: /Edit form/ })).not.toBeInTheDocument());
  });
});
