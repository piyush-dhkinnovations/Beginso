import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ResponsesLanding } from '@/components/responses/ResponsesLanding';
import type { Form } from '@/types/form';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { name: 'Pavi' } }) }));

let view: 'list' | 'grid' = 'list';
const setView = vi.fn((v: 'list' | 'grid') => {
  view = v;
});
vi.mock('@/hooks/useFormsView', () => ({ useFormsView: () => [view, setView] }));

const mockGetAll = vi.fn();
vi.mock('@/services/forms', () => ({ formsService: { getAllForms: (...a: unknown[]) => mockGetAll(...a) } }));
vi.mock('@/components/forms/FormCard', () => ({
  FormCard: ({ form, href }: { form: Form; href: string }) => <a href={href}>card:{form.title}</a>,
}));

const form = (id: string, title: string, responseCount: number, updatedAt = '2026-01-01T00:00:00Z'): Form =>
  ({ _id: id, title, responseCount, status: 'published', createdAt: '2026-01-01T00:00:00Z', updatedAt, branding: {} }) as unknown as Form;

const forms = [form('a', 'Alpha', 0), form('b', 'Bravo', 12), form('c', 'Charlie', 3)];

function renderLanding(scope?: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ResponsesLanding scope={scope} />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  view = 'list';
  push.mockClear();
  mockGetAll.mockReset().mockResolvedValue({ forms });
});

const rowTitles = () => screen.getAllByText(/^(Alpha|Bravo|Charlie)$/).map((n) => n.textContent);

describe('ResponsesLanding', () => {
  it('shows a loading skeleton first', () => {
    mockGetAll.mockReturnValue(new Promise(() => {}));
    renderLanding();
    expect(screen.getByLabelText('Loading forms')).toHaveAttribute('aria-busy', 'true');
  });

  it('summarises the forms and orders by response count', async () => {
    renderLanding();
    expect(await screen.findByText(/3 forms · 15 responses/)).toBeInTheDocument();
    expect(rowTitles()).toEqual(['Bravo', 'Charlie', 'Alpha']);
  });

  it('requests personal vs workspace forms by scope', async () => {
    renderLanding();
    await screen.findByText('Bravo');
    expect(mockGetAll).toHaveBeenCalledWith({ type: 'personal' });
    mockGetAll.mockClear();
    renderLanding('acme');
    await screen.findAllByText('Bravo');
    expect(mockGetAll).toHaveBeenCalledWith({ type: 'workspace', workspaceId: 'acme' });
  });

  it('filter chips show counts and narrow the list', async () => {
    renderLanding();
    await screen.findByText('Bravo');
    expect(screen.getByRole('button', { name: /^All forms 3/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^With responses 2/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^No responses yet 1/ }));
    expect(rowTitles()).toEqual(['Alpha']);
    await userEvent.click(screen.getByRole('button', { name: /^With responses/ }));
    expect(rowTitles()).toEqual(['Bravo', 'Charlie']);
  });

  it('searches by title, case-insensitively, and offers Clear filters when nothing matches', async () => {
    renderLanding();
    await screen.findByText('Bravo');
    const search = screen.getByRole('searchbox', { name: 'Search forms' });
    await userEvent.type(search, 'CHAR');
    expect(rowTitles()).toEqual(['Charlie']);
    await userEvent.clear(search);
    await userEvent.type(search, 'zzz');
    expect(screen.getByText('No forms match')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(rowTitles()).toHaveLength(3);
    expect(search).toHaveValue('');
  });

  it('opens a form inbox when a row is clicked (personal)', async () => {
    renderLanding();
    await userEvent.click(await screen.findByText('Bravo'));
    expect(push).toHaveBeenCalledWith('/forms/b/inbox');
  });

  it('adds the workspace to the inbox link in a workspace', async () => {
    renderLanding('my team');
    await userEvent.click(await screen.findByText('Bravo'));
    expect(push).toHaveBeenCalledWith('/forms/b/inbox?ws=my%20team');
  });

  it('sorts by clicking a header and toggles direction', async () => {
    renderLanding();
    await screen.findByText('Bravo');
    const titleHeader = screen.getByRole('columnheader', { name: /Form Title/ });
    await userEvent.click(within(titleHeader).getByRole('button'));
    expect(rowTitles()).toEqual(['Alpha', 'Bravo', 'Charlie']);
    await userEvent.click(within(titleHeader).getByRole('button'));
    expect(rowTitles()).toEqual(['Charlie', 'Bravo', 'Alpha']);
  });

  it('renders cards in grid view', async () => {
    view = 'grid';
    renderLanding('acme');
    const card = await screen.findByRole('link', { name: 'card:Bravo' });
    expect(card).toHaveAttribute('href', '/forms/b/inbox?ws=acme');
  });

  it('switching view calls the toggle', async () => {
    renderLanding();
    await screen.findByText('Bravo');
    await userEvent.click(screen.getByRole('button', { name: 'Grid view' }));
    expect(setView).toHaveBeenCalledWith('grid');
  });

  it('empty state links to the right Forms page', async () => {
    mockGetAll.mockResolvedValue({ forms: [] });
    renderLanding('acme');
    expect(await screen.findByText('No forms yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Forms' })).toHaveAttribute('href', '/w/acme/forms');
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it('shows an error with a working retry', async () => {
    mockGetAll.mockRejectedValueOnce(new Error('x'));
    renderLanding();
    expect(await screen.findByText('Unable to load your forms')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Bravo')).toBeInTheDocument();
  });

  it('uses singular wording for one form and one response', async () => {
    mockGetAll.mockResolvedValue({ forms: [form('a', 'Solo', 1)] });
    renderLanding();
    expect(await screen.findByText(/1 form · 1 response\./)).toBeInTheDocument();
  });
});
