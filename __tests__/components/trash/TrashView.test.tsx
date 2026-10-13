import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserFacingError } from '@/lib/errorHelpers';
import { TrashView } from '@/components/trash/TrashView';
import type { TrashItem, TrashListResponse } from '@/types/trash';

const mockToast = vi.fn();
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast: mockToast }) }));

const mockList = vi.fn();
const mockRestore = vi.fn();
const mockPurge = vi.fn();
const mockEmpty = vi.fn();
vi.mock('@/services/trash', () => ({
  trashService: {
    list: (...a: unknown[]) => mockList(...a),
    restore: (...a: unknown[]) => mockRestore(...a),
    purge: (...a: unknown[]) => mockPurge(...a),
    empty: (...a: unknown[]) => mockEmpty(...a),
  },
}));

const item = (over: Partial<TrashItem> = {}): TrashItem => ({
  id: 'i1',
  type: 'form',
  name: 'Old survey',
  responseCount: 4,
  deletedAt: '2026-10-01T00:00:00Z',
  deletedBy: { id: 'u1', name: 'Asha' },
  purgeAt: '2026-10-31T00:00:00Z',
  daysLeft: 20,
  canRestore: true,
  canPurge: true,
  ...over,
});

const page = (items: TrashItem[], total = items.length): TrashListResponse => ({ items, total, page: 1, limit: 25, storageBytes: 2048 });

// The component asks the same endpoint for the list and for three `limit=1` count probes.
function serve(items: TrashItem[], totals = { all: items.length, form: items.length, response: 0 }) {
  mockList.mockImplementation((_scope: string, p: { type?: 'form' | 'response'; limit: number }) => {
    if (p.limit === 1) return Promise.resolve(page([], totals[p.type ?? 'all']));
    const filtered = p.type ? items.filter((i) => i.type === p.type) : items;
    return Promise.resolve(page(filtered, p.type ? filtered.length : totals.all));
  });
}

function renderView(scope = 'personal') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const spy = vi.spyOn(client, 'invalidateQueries');
  render(
    <QueryClientProvider client={client}>
      <TrashView scope={scope} />
    </QueryClientProvider>
  );
  return { spy };
}

beforeEach(() => {
  [mockToast, mockList, mockRestore, mockPurge, mockEmpty].forEach((m) => m.mockReset());
});

describe('TrashView', () => {
  it('shows a loading skeleton first', () => {
    mockList.mockReturnValue(new Promise(() => {}));
    renderView();
    expect(screen.getByLabelText('Loading trash')).toBeInTheDocument();
  });

  it('lists items, labels the scope and summarises counts and storage', async () => {
    serve([item(), item({ id: 'r1', type: 'response', name: 'Response #4', formTitle: 'Survey' })], { all: 2, form: 1, response: 1 });
    renderView('acme');
    expect(await screen.findByText('Old survey')).toBeInTheDocument();
    expect(screen.getByText('Workspace')).toBeInTheDocument();
    expect(await screen.findByText(/2 items · 1 form · 1 response · 2(\.0)? KB of storage · removed permanently after 30 days/)).toBeInTheDocument();
    expect(mockList).toHaveBeenCalledWith('acme', { type: undefined, page: 1, limit: 25 });
  });

  it('uses the personal eyebrow in personal scope', async () => {
    serve([item()]);
    renderView();
    expect(await screen.findByText('Personal space')).toBeInTheDocument();
  });

  it('shows chip counts and filters by type', async () => {
    serve([item(), item({ id: 'r1', type: 'response', name: 'Response #4' })], { all: 2, form: 1, response: 1 });
    renderView();
    await screen.findByText('Old survey');
    await userEvent.click(await screen.findByRole('button', { name: /^Responses 1/ }));
    await waitFor(() => expect(mockList).toHaveBeenCalledWith('personal', { type: 'response', page: 1, limit: 25 }));
    await waitFor(() => expect(screen.queryByText('Old survey')).not.toBeInTheDocument());
    expect(screen.getByText('Response #4')).toBeInTheDocument();
  });

  it('empty trash shows the empty state with links', async () => {
    serve([], { all: 0, form: 0, response: 0 });
    renderView('acme');
    expect(await screen.findByText('Trash is empty')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Forms' })).toHaveAttribute('href', '/w/acme/forms');
    expect(screen.getByRole('link', { name: 'Go to Home' })).toHaveAttribute('href', '/w/acme');
    expect(screen.queryByRole('button', { name: /Empty trash/ })).not.toBeInTheDocument();
  });

  it('an empty filtered tab with items elsewhere offers Clear filter', async () => {
    serve([item()], { all: 3, form: 3, response: 0 });
    renderView();
    await screen.findByText('Old survey');
    await userEvent.click(await screen.findByRole('button', { name: /^Responses/ }));
    expect(await screen.findByText('No deleted responses')).toBeInTheDocument();
    expect(screen.getByText('There are 3 other items in Trash.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Clear filter' }));
    expect(await screen.findByText('Old survey')).toBeInTheDocument();
  });

  it('a 403 shows the owner/admin message with no retry and no filter chips', async () => {
    mockList.mockRejectedValue({ response: { status: 403 } });
    renderView();
    expect(await screen.findByText('Only an Owner or Admin can manage Trash.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Trash item type' })).not.toBeInTheDocument();
  });

  it('another error shows an alert with a working retry', async () => {
    mockList.mockRejectedValueOnce({ response: { status: 500 } });
    mockList.mockResolvedValue(page([item()]));
    renderView();
    expect(await screen.findByText('We could not load the trash.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Old survey')).toBeInTheDocument();
  });

  it('restores an item, toasts and refreshes the related lists', async () => {
    serve([item()]);
    mockRestore.mockResolvedValue(undefined);
    const { spy } = renderView();
    await userEvent.click(await screen.findByRole('button', { name: /Restore/ }));
    await waitFor(() => expect(mockRestore).toHaveBeenCalledWith('personal', 'form', 'i1'));
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith('"Old survey" restored', 'success'));
    const keys = spy.mock.calls.map((c) => (c[0] as { queryKey: unknown[] }).queryKey[0]);
    expect(keys).toEqual(expect.arrayContaining(['trash', 'forms', 'responses', 'form']));
  });

  it('shows an error toast when restore fails', async () => {
    serve([item()]);
    mockRestore.mockRejectedValue(new UserFacingError('The form "Old survey" is in Trash. Restore it first.'));
    renderView();
    await userEvent.click(await screen.findByRole('button', { name: /Restore/ }));
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith('The form "Old survey" is in Trash. Restore it first.', 'error'));
  });

  it('hides actions the server did not allow', async () => {
    serve([item({ canRestore: false, canPurge: false })]);
    renderView();
    await screen.findByText('Old survey');
    expect(screen.queryByRole('button', { name: /Restore/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete now' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Empty trash/ })).not.toBeInTheDocument();
  });

  it('purging a form needs DELETE typed, mentions the response count, then deletes', async () => {
    serve([item()]);
    mockPurge.mockResolvedValue(undefined);
    renderView();
    await userEvent.click(await screen.findByRole('button', { name: 'Delete now' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Permanently delete "Old survey"');
    expect(dialog).toHaveTextContent('The form and its 4 responses');
    const confirm = within(dialog).getByRole('button', { name: 'Delete permanently' });
    expect(confirm).toBeDisabled();
    await userEvent.type(within(dialog).getByLabelText('Type DELETE to confirm'), 'DELETE');
    await userEvent.click(confirm);
    await waitFor(() => expect(mockPurge).toHaveBeenCalledWith('personal', 'form', 'i1'));
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith('"Old survey" deleted permanently', 'success'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('says the count is unavailable when a form has no responseCount, and uses response wording for responses', async () => {
    serve([item({ responseCount: undefined }), item({ id: 'r1', type: 'response', name: 'Response #9' })]);
    renderView();
    const buttons = await screen.findAllByRole('button', { name: 'Delete now' });
    await userEvent.click(buttons[0]);
    expect(screen.getByRole('dialog')).toHaveTextContent('(count unavailable)');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await userEvent.click(buttons[1]);
    expect(screen.getByRole('dialog')).toHaveTextContent('The response and its uploaded files');
  });

  it('empties the trash after confirmation and reports the counts', async () => {
    serve([item()], { all: 1, form: 1, response: 0 });
    mockEmpty.mockResolvedValue({ forms: 1, responses: 2 });
    renderView();
    await userEvent.click(await screen.findByRole('button', { name: 'Empty trash' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('All 1 item in Trash');
    await userEvent.type(within(dialog).getByLabelText('Type DELETE to confirm'), 'DELETE');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Empty trash' }));
    await waitFor(() => expect(mockEmpty).toHaveBeenCalledWith('personal'));
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith('Trash emptied (1 form, 2 responses)', 'success'));
  });

  it('on a filtered tab the empty-trash dialog does not claim an exact count', async () => {
    serve([item()], { all: 3, form: 1, response: 2 });
    renderView();
    await screen.findByText('Old survey');
    await userEvent.click(await screen.findByRole('button', { name: /^Forms/ }));
    await waitFor(() => expect(mockList).toHaveBeenCalledWith('personal', { type: 'form', page: 1, limit: 25 }));
    await userEvent.click(await screen.findByRole('button', { name: 'Empty trash' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('exact count is only shown on the All tab');
  });
});
