import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GlobalSearch } from '@/components/search/GlobalSearch';
import { OPEN_SEARCH_EVENT } from '@/components/search/SearchTrigger';
import { searchKeys } from '@/lib/queryKeys';
import type { SearchResponse } from '@/types/search';
import type { Role } from '@/types/workspace';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

interface SearchState {
  data?: SearchResponse;
  pending: boolean;
  isLoading: boolean;
  isError: boolean;
  refetch: ReturnType<typeof vi.fn>;
}
let state: SearchState;
const searchSpy = vi.fn();
vi.mock('@/hooks/useGlobalSearch', () => ({
  SEARCH_MIN_CHARS: 2,
  SEARCH_MAX_CHARS: 100,
  useGlobalSearch: (scope: string, q: string) => {
    searchSpy(scope, q);
    return state;
  },
}));
let role: Role | undefined = 'owner';
vi.mock('@/hooks/useWorkspaceRole', () => ({ useWorkspaceRole: () => role }));
vi.mock('@/hooks/useSearchScopeNote', () => ({
  RESPONSES_SCOPE_NOTE: 'Answer text is not searchable yet.',
  useSearchScopeNote: () => 'Searching Acme',
}));

const response = (over: Partial<SearchResponse> = {}): SearchResponse => ({
  q: 'sur',
  scope: { kind: 'workspace', label: 'Acme' },
  answerSearch: false,
  groups: {
    forms: { total: 2, items: [{ id: 'f1', type: 'forms', title: 'Survey one' }, { id: 'f2', type: 'forms', title: 'Survey two' }] },
    responses: { total: 1, items: [{ id: 'r1', type: 'responses', title: 'Response r1', formId: 'f1', reference: '#1' }] },
    members: { total: 0, items: [] },
    templates: { total: 0, items: [] },
  },
  ...over,
});

let client: QueryClient;
function renderSearch(scope = 'acme') {
  client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <GlobalSearch scope={scope} />
    </QueryClientProvider>
  );
}
const openPalette = () => act(() => void window.dispatchEvent(new Event(OPEN_SEARCH_EVENT)));
const box = () => screen.getByRole('combobox', { name: 'Search' });

beforeEach(() => {
  push.mockReset();
  searchSpy.mockReset();
  role = 'owner';
  state = { data: undefined, pending: false, isLoading: false, isError: false, refetch: vi.fn() };
});

describe('GlobalSearch', () => {
  it('is closed until opened', () => {
    renderSearch();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it.each([
    ['ctrlKey', { ctrlKey: true }],
    ['metaKey', { metaKey: true }],
  ])('opens on %s+K and prevents the browser default', (_n, mods) => {
    renderSearch();
    const ev = new KeyboardEvent('keydown', { key: 'k', cancelable: true, ...mods });
    act(() => void window.dispatchEvent(ev));
    expect(ev.defaultPrevented).toBe(true);
    expect(screen.getByRole('dialog', { name: 'Search' })).toBeInTheDocument();
  });

  it.each([
    ['plain k', { key: 'k' }],
    ['ctrl+shift+k', { key: 'k', ctrlKey: true, shiftKey: true }],
    ['ctrl+alt+k', { key: 'k', ctrlKey: true, altKey: true }],
    ['ctrl+j', { key: 'j', ctrlKey: true }],
  ])('ignores %s', (_n, init) => {
    renderSearch();
    act(() => void window.dispatchEvent(new KeyboardEvent('keydown', { ...init })));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not steal the shortcut from a contenteditable editor', () => {
    renderSearch();
    const editor = document.createElement('div');
    editor.setAttribute('contenteditable', 'true');
    document.body.appendChild(editor);
    fireEvent.keyDown(editor, { key: 'k', ctrlKey: true });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    editor.remove();
  });

  it('still works with focus in an ordinary input', () => {
    renderSearch();
    const input = document.createElement('input');
    document.body.appendChild(input);
    fireEvent.keyDown(input, { key: 'k', ctrlKey: true });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    input.remove();
  });

  it('opens from the SearchTrigger event and shows the hint with the scope note', () => {
    renderSearch();
    openPalette();
    expect(screen.getByText('Search forms, responses, members, templates')).toBeInTheDocument();
    expect(screen.getByText('Searching Acme')).toBeInTheDocument();
  });

  it('caps the input length', () => {
    renderSearch();
    openPalette();
    expect(box()).toHaveAttribute('maxlength', '100');
  });

  it('shows the hint, not results, below the minimum length', async () => {
    state.data = response();
    renderSearch();
    openPalette();
    await userEvent.type(box(), 's');
    expect(screen.getByText('Search forms, responses, members, templates')).toBeInTheDocument();
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
  });

  it('shows grouped results with totals, then a See all row', async () => {
    state.data = response();
    renderSearch();
    openPalette();
    await userEvent.type(box(), 'sur');
    expect(searchSpy).toHaveBeenLastCalledWith('acme', 'sur');
    expect(screen.getByText('Forms (2)')).toBeInTheDocument();
    expect(screen.getByText('Responses (1)')).toBeInTheDocument();
    expect(screen.getByText('All results')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(2 + 1 + 1);
    expect(screen.getByText('Answer text is not searchable yet.')).toBeInTheDocument();
    expect(screen.getByText('Responses: reference and respondent only')).toBeInTheDocument();
  });

  it('shows only five rows per group but the real total', async () => {
    const items = Array.from({ length: 8 }, (_, i) => ({ id: `f${i}`, type: 'forms' as const, title: `Form ${i}` }));
    state.data = response({ groups: { ...response().groups, forms: { total: 8, items }, responses: { total: 0, items: [] } } });
    renderSearch();
    openPalette();
    await userEvent.type(box(), 'for');
    expect(screen.getByText('Forms (8)')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(5 + 1);
  });

  it('drops the responses note and footer when answer search is on', async () => {
    state.data = response({ answerSearch: true });
    renderSearch();
    openPalette();
    await userEvent.type(box(), 'sur');
    expect(screen.queryByText('Answer text is not searchable yet.')).not.toBeInTheDocument();
    expect(screen.queryByText('Responses: reference and respondent only')).not.toBeInTheDocument();
  });

  it('selecting a result navigates to its target and closes', async () => {
    state.data = response();
    renderSearch();
    openPalette();
    await userEvent.type(box(), 'sur');
    await userEvent.click(screen.getByRole('option', { name: /Survey two/ }));
    expect(push).toHaveBeenCalledWith('/forms/f2/overview?ws=acme');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Enter opens the highlighted result', async () => {
    state.data = response();
    renderSearch();
    openPalette();
    await userEvent.type(box(), 'sur');
    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(push).toHaveBeenCalledWith('/forms/f2/overview?ws=acme');
  });

  it('See all results goes to the search page with the encoded query, per scope', async () => {
    state.data = response();
    const { unmount } = renderSearch('acme');
    openPalette();
    await userEvent.type(box(), 'a&b ');
    await userEvent.click(screen.getByRole('option', { name: /See all results/ }));
    expect(push).toHaveBeenCalledWith('/w/acme/search?q=a%26b');
    unmount();

    push.mockReset();
    renderSearch('personal');
    openPalette();
    await userEvent.type(box(), 'tax');
    await userEvent.click(screen.getByRole('option', { name: /See all results/ }));
    expect(push).toHaveBeenCalledWith('/search?q=tax');
  });

  it('shows skeletons while a search is pending', async () => {
    state.pending = true;
    renderSearch();
    openPalette();
    await userEvent.type(box(), 'sur');
    expect(screen.getByLabelText('Searching')).toHaveAttribute('aria-busy', 'true');
  });

  it('shows the no-results message with the typed term', async () => {
    state.data = response({ groups: { forms: { total: 0, items: [] }, responses: { total: 0, items: [] }, members: { total: 0, items: [] }, templates: { total: 0, items: [] } } });
    renderSearch();
    openPalette();
    await userEvent.type(box(), 'zzz');
    expect(screen.getByText(/No results for/)).toHaveTextContent('No results for “zzz”');
    expect(screen.queryByText('All results')).not.toBeInTheDocument();
  });

  it('shows an error with retry', async () => {
    state.isError = true;
    renderSearch();
    openPalette();
    await userEvent.type(box(), 'sur');
    expect(screen.getByRole('alert')).toHaveTextContent('We could not search right now.');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(state.refetch).toHaveBeenCalled();
  });

  it('announces the result count (debounced)', async () => {
    state.data = response();
    renderSearch();
    openPalette();
    await userEvent.type(box(), 'sur');
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('3 results'), { timeout: 2000 });
  });

  it('Escape closes the palette and clears the query', async () => {
    renderSearch();
    openPalette();
    await userEvent.type(box(), 'sur');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    openPalette();
    expect(box()).toHaveValue('');
  });

  it('clears cached results whenever the role changes', () => {
    const { rerender } = renderSearch();
    client.setQueryData(searchKeys.results('acme', 'sur'), response());
    expect(client.getQueryData(searchKeys.results('acme', 'sur'))).toBeDefined();
    role = 'viewer' as Role;
    rerender(
      <QueryClientProvider client={client}>
        <GlobalSearch scope="acme" />
      </QueryClientProvider>
    );
    expect(client.getQueryData(searchKeys.results('acme', 'sur'))).toBeUndefined();
  });
});
