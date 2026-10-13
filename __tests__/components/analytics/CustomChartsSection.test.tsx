import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError, type AxiosResponse } from 'axios';
import type { SavedChart } from '@/types/charts';
import type { Form } from '@/types/form';

const mockPush = vi.fn();
const mockReplace = vi.fn();
let search = '';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => '/forms/f1/insights',
  useSearchParams: () => new URLSearchParams(search),
}));

const mockToast = vi.fn();
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast: mockToast }) }));

let role: string | undefined = 'owner';
vi.mock('@/hooks/useWorkspaceRole', () => ({ useWorkspaceRole: () => role }));
vi.mock('@/hooks/useStages', () => ({ useStages: () => ({ data: [] }) }));

const svc = vi.hoisted(() => ({ list: vi.fn(), create: vi.fn(), update: vi.fn(), duplicate: vi.fn(), remove: vi.fn(), reorder: vi.fn() }));
vi.mock('@/services/charts', () => ({ chartsService: svc }));

vi.mock('@/components/analytics/CustomChartCard', () => ({
  CustomChartCard: (p: {
    chart: SavedChart; canManage: boolean; dragHandle?: React.ReactNode;
    onEdit: (c: SavedChart) => void; onDuplicate: (c: SavedChart) => void; onRemove: (c: SavedChart) => void;
    onResize: (c: SavedChart, s: 'large') => void; onFullScreen: (c: SavedChart) => void; onSelect: (c: SavedChart, t: unknown) => void;
  }) => (
    <article aria-label={`card ${p.chart.title}`} data-manage={String(p.canManage)}>
      {p.dragHandle}
      <button onClick={() => p.onEdit(p.chart)}>edit {p.chart.title}</button>
      <button onClick={() => p.onDuplicate(p.chart)}>dup {p.chart.title}</button>
      <button onClick={() => p.onRemove(p.chart)}>rm {p.chart.title}</button>
      <button onClick={() => p.onResize(p.chart, 'large')}>big {p.chart.title}</button>
      <button onClick={() => p.onFullScreen(p.chart)}>fs {p.chart.title}</button>
      <button onClick={() => p.onSelect(p.chart, { kind: 'segment', value: 'Red' })}>drill {p.chart.title}</button>
    </article>
  ),
}));
vi.mock('@/components/analytics/ChartDrawer', () => ({
  ChartDrawer: (p: { isOpen: boolean; editing: SavedChart | null; onClose: () => void; onSubmit: (d: unknown) => void }) =>
    p.isOpen ? (
      <div role="dialog" aria-label="chart drawer">
        <span>{p.editing ? `editing ${p.editing.title}` : 'adding'}</span>
        <button onClick={() => p.onSubmit({ fieldId: 'f1', title: 'New' })}>submit-chart</button>
        <button onClick={p.onClose}>close-drawer</button>
      </div>
    ) : null,
}));
vi.mock('@/components/analytics/ChartFullScreen', () => ({
  ChartFullScreen: (p: { isOpen: boolean; chart: SavedChart; onClose: () => void }) => (
    <div data-testid="fullscreen" data-open={String(p.isOpen)}>{p.chart.title}<button onClick={p.onClose}>close-fs</button></div>
  ),
}));
vi.mock('@/components/analytics/ChartDrillPanel', () => ({
  ChartDrillPanel: (p: { isOpen: boolean; drill: { chartId: string } | null; onOpenResponse: (id: string) => void }) => (
    <div data-testid="drill" data-open={String(p.isOpen)} data-chart={p.drill?.chartId ?? ''}>
      <button onClick={() => p.onOpenResponse('r1')}>open-response</button>
    </div>
  ),
}));
vi.mock('@/components/responses/ResponseDrawer', () => ({
  ResponseDrawer: (p: { responseId: string; onClose: () => void }) => <div data-testid="response">{p.responseId}<button onClick={p.onClose}>close-response</button></div>,
}));

import { CustomChartsSection } from '@/components/analytics/CustomChartsSection';
import { AuthContext } from '@/lib/authContext';

const mk = (id: string, position: number, over: Partial<SavedChart> = {}): SavedChart => ({
  _id: id, position, fieldId: 'f1', type: 'pie', size: 'medium', title: `Chart ${id}`,
  options: { valueMode: 'count', legend: true, sort: 'value' }, visibility: 'private', ...over,
});
const form = { title: 'Survey', fields: [{ fieldId: 'f1', pageId: 'p', type: 'dropdown', label: 'Colour', required: false, deleted: false, order: 0, options: ['Red'] }] } as unknown as Form;
const httpError = (status: number) => new AxiosError('x', 'ERR', undefined, undefined, { status } as AxiosResponse);

function setup(over: Partial<React.ComponentProps<typeof CustomChartsSection>> = {}, user: { id: string } | null = { id: 'me' }) {
  const props = { form, formId: 'f1', scope: 'personal', range: {}, addOpen: false, onAddClose: vi.fn(), onAddRequest: vi.fn(), ...over };
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <AuthContext.Provider value={{ user } as never}><CustomChartsSection {...props} /></AuthContext.Provider>
    </QueryClientProvider>,
  );
  return props;
}

describe('CustomChartsSection', () => {
  beforeEach(() => {
    Object.values(svc).forEach((f) => f.mockReset());
    mockToast.mockReset();
    mockPush.mockReset();
    mockReplace.mockReset();
    search = '';
    role = 'owner';
  });

  it('shows a loading skeleton first', () => {
    svc.list.mockReturnValue(new Promise(() => undefined));
    setup();
    expect(screen.getByLabelText('Loading your charts')).toHaveAttribute('aria-busy', 'true');
  });

  it('shows a no-access state on 403', async () => {
    svc.list.mockRejectedValue(httpError(403));
    setup();
    expect(await screen.findByText('No access')).toBeInTheDocument();
  });

  it('shows a retryable error state on other failures', async () => {
    const user = userEvent.setup();
    svc.list.mockRejectedValue(httpError(500));
    setup();
    expect(await screen.findByText('Unable to load your charts')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(svc.list).toHaveBeenCalledTimes(2));
  });

  it('tells editors with no charts to add one', async () => {
    const user = userEvent.setup();
    svc.list.mockResolvedValue([]);
    const props = setup();
    expect(await screen.findByText('No charts yet')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Add chart/ }));
    expect(props.onAddRequest).toHaveBeenCalled();
  });

  it('explains when the form has no chartable questions', async () => {
    svc.list.mockResolvedValue([]);
    setup({ form: { ...form, fields: [] } as Form });
    expect(await screen.findByText('Nothing to chart yet')).toBeInTheDocument();
  });

  it('shows a read-only message to viewers when nothing is shared', async () => {
    role = 'reviewer';
    svc.list.mockResolvedValue([]);
    setup({ scope: 'acme' });
    expect(await screen.findByText('No charts have been shared on this form yet.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add chart/ })).not.toBeInTheDocument();
  });

  it('orders my charts by position and separates shared ones, read-only', async () => {
    svc.list.mockResolvedValue([mk('b', 2), mk('a', 1), mk('s', 0, { ownerId: 'other' })]);
    setup();
    await screen.findByLabelText('card Chart a');
    const cards = screen.getAllByRole('article');
    expect(cards.map((c) => c.getAttribute('aria-label'))).toEqual(['card Chart a', 'card Chart b', 'card Chart s']);
    expect(cards[0]).toHaveAttribute('data-manage', 'true');
    expect(cards[2]).toHaveAttribute('data-manage', 'false');
    expect(screen.getByRole('heading', { name: 'Shared with the workspace' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reorder chart Chart a' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reorder chart Chart s' })).not.toBeInTheDocument();
  });

  it('treats every chart as read-only without edit rights and hides the drawer', async () => {
    role = 'reviewer';
    svc.list.mockResolvedValue([mk('a', 0)]);
    setup({ scope: 'acme', addOpen: true });
    const card = await screen.findByLabelText('card Chart a');
    expect(card).toHaveAttribute('data-manage', 'false');
    expect(screen.queryByRole('heading', { name: 'Shared with the workspace' })).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'chart drawer' })).not.toBeInTheDocument();
  });

  it('adds a chart at the next position, then confirms and closes the drawer', async () => {
    const user = userEvent.setup();
    svc.list.mockResolvedValue([mk('a', 4)]);
    svc.create.mockResolvedValue(mk('n', 5));
    const props = setup({ addOpen: true });
    await user.click(await screen.findByText('submit-chart'));
    await waitFor(() => expect(svc.create).toHaveBeenCalledWith('f1', { fieldId: 'f1', title: 'New', position: 5 }, 'personal'));
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith('Chart added to the dashboard.', 'success'));
    expect(props.onAddClose).toHaveBeenCalled();
  });

  it('edits a chart through the drawer', async () => {
    const user = userEvent.setup();
    svc.list.mockResolvedValue([mk('a', 0)]);
    svc.update.mockResolvedValue(mk('a', 0));
    setup();
    await user.click(await screen.findByText('edit Chart a'));
    expect(screen.getByText('editing Chart a')).toBeInTheDocument();
    await user.click(screen.getByText('submit-chart'));
    await waitFor(() => expect(svc.update).toHaveBeenCalledWith('f1', 'a', { fieldId: 'f1', title: 'New' }, 'personal'));
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith('Chart updated.', 'success'));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'chart drawer' })).not.toBeInTheDocument());
  });

  it('duplicates a chart', async () => {
    const user = userEvent.setup();
    svc.list.mockResolvedValue([mk('a', 0)]);
    svc.duplicate.mockResolvedValue(mk('a2', 1));
    setup();
    await user.click(await screen.findByText('dup Chart a'));
    await waitFor(() => expect(svc.duplicate).toHaveBeenCalledWith('f1', 'a', 'personal'));
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith('Chart duplicated.', 'success'));
  });

  it('resizes a chart optimistically via update', async () => {
    const user = userEvent.setup();
    svc.list.mockResolvedValue([mk('a', 0)]);
    svc.update.mockResolvedValue(mk('a', 0, { size: 'large' }));
    setup();
    await user.click(await screen.findByText('big Chart a'));
    await waitFor(() => expect(svc.update).toHaveBeenCalledWith('f1', 'a', { size: 'large' }, 'personal'));
  });

  it('removes a chart optimistically and offers Undo that re-creates it', async () => {
    const user = userEvent.setup();
    svc.list.mockResolvedValueOnce([mk('a', 3)]).mockResolvedValue([]);
    svc.remove.mockResolvedValue(undefined);
    svc.create.mockResolvedValue(mk('a', 3));
    setup();
    await user.click(await screen.findByText('rm Chart a'));
    await waitFor(() => expect(svc.remove).toHaveBeenCalledWith('f1', 'a', 'personal'));
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith('Removed "Chart a".', 'success', 8000, expect.objectContaining({ label: 'Undo' })));
    const action = mockToast.mock.calls.find((c) => c[0] === 'Removed "Chart a".')![3] as { onClick: () => void };
    action.onClick();
    await waitFor(() => expect(svc.create).toHaveBeenCalledWith('f1', expect.objectContaining({ title: 'Chart a', position: 3 }), 'personal'));
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith('Chart restored.', 'success'));
  });

  it('reports a permission error on 403 and the generic message otherwise', async () => {
    const user = userEvent.setup();
    svc.list.mockResolvedValue([mk('a', 0)]);
    svc.duplicate.mockRejectedValueOnce(httpError(403)).mockRejectedValueOnce(new Error('x'));
    setup();
    await user.click(await screen.findByText('dup Chart a'));
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith("You don't have permission to change charts on this form.", 'error'));
    await user.click(screen.getByText('dup Chart a'));
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith('Could not duplicate the chart. Please try again.', 'error'));
  });

  it('opens full screen and hides it behind the drill panel when a segment is picked', async () => {
    const user = userEvent.setup();
    svc.list.mockResolvedValue([mk('a', 0)]);
    setup();
    await user.click(await screen.findByText('fs Chart a'));
    expect(screen.getByTestId('fullscreen')).toHaveAttribute('data-open', 'true');
    await user.click(screen.getByText('drill Chart a'));
    expect(screen.getByTestId('fullscreen')).toHaveAttribute('data-open', 'false');
    expect(screen.getByTestId('drill')).toHaveAttribute('data-open', 'true');
    expect(screen.getByTestId('drill')).toHaveAttribute('data-chart', 'a');
    await user.click(screen.getByText('close-fs'));
    expect(screen.queryByTestId('fullscreen')).not.toBeInTheDocument();
  });

  it('pushes the response id into the URL when opened from the drill panel', async () => {
    const user = userEvent.setup();
    svc.list.mockResolvedValue([mk('a', 0)]);
    search = 'tab=charts';
    setup();
    await screen.findByLabelText('card Chart a');
    await user.click(screen.getByText('open-response'));
    expect(mockPush).toHaveBeenCalledWith('/forms/f1/insights?tab=charts&responseId=r1');
  });

  it('shows the response drawer for ?responseId and removes the param on close', async () => {
    const user = userEvent.setup();
    svc.list.mockResolvedValue([mk('a', 0)]);
    search = 'responseId=r9&tab=charts';
    setup();
    expect(await screen.findByTestId('response')).toHaveTextContent('r9');
    expect(screen.getByTestId('drill')).toHaveAttribute('data-open', 'false');
    await user.click(screen.getByText('close-response'));
    expect(mockReplace).toHaveBeenCalledWith('/forms/f1/insights?tab=charts');
  });

  it('treats a chart owned by someone else as shared even for an editor', async () => {
    svc.list.mockResolvedValue([mk('a', 0, { ownerId: 'someone' })]);
    setup({}, { id: 'me' });
    expect(await screen.findByLabelText('card Chart a')).toHaveAttribute('data-manage', 'false');
    expect(screen.queryByRole('heading', { name: 'Shared with the workspace' })).not.toBeInTheDocument();
  });
});
