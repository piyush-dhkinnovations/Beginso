import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError, type AxiosResponse } from 'axios';
import { ToastProvider } from '@/components/ui/Toast';

const mockGet = vi.fn();
const mockSave = vi.fn();
const mockReset = vi.fn();
vi.mock('@/services/dashboardLayout', () => ({
  dashboardLayoutService: {
    get: (...a: unknown[]) => mockGet(...a),
    save: (...a: unknown[]) => mockSave(...a),
    reset: (...a: unknown[]) => mockReset(...a),
  },
}));

vi.mock('@/components/dashboard-grid/DashboardGrid', () => ({
  DashboardGrid: ({ widgets, onChange, empty }: { widgets: { id: string }[]; onChange?: (w: unknown[]) => void; empty: React.ReactNode }) => (
    <div data-testid="grid" data-editing={String(!!onChange)}>
      {widgets.length === 0 ? empty : widgets.map((w) => w.id).join(',')}
      {onChange && <button onClick={() => onChange([])}>clear-all</button>}
    </div>
  ),
}));
vi.mock('@/components/dashboard-grid/AddWidgetDrawer', () => ({
  AddWidgetDrawer: ({ isOpen, onAdd }: { isOpen: boolean; onAdd: (w: unknown) => void }) =>
    isOpen ? <button onClick={() => onAdd({ w: 3, config: { type: 'kpi', variant: 1, metric: 'm' } })}>pick-widget</button> : null,
}));

import { CustomDashboard } from '@/components/dashboard-grid/CustomDashboard';
import type { Widget } from '@/components/dashboard-grid/types';

const defaults: Widget[] = [{ id: 'd1', w: 3, config: { type: 'kpi', variant: 1, metric: 'm' } }];
const savedWidgets: Widget[] = [{ id: 's1', w: 6, config: { type: 'kpi', variant: 2, metric: 'm' } }];

function renderIt(props: Partial<React.ComponentProps<typeof CustomDashboard>> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ToastProvider><CustomDashboard scope="personal" defaults={defaults} metrics={{}} {...props} /></ToastProvider>
    </QueryClientProvider>,
  );
}

const httpError = (status: number, data?: unknown) =>
  new AxiosError('fail', 'ERR', undefined, undefined, { status, data } as AxiosResponse);

describe('CustomDashboard', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockSave.mockReset();
    mockReset.mockReset();
  });

  it('shows a loading skeleton, then the defaults when nothing is saved', async () => {
    mockGet.mockResolvedValue(null);
    renderIt();
    expect(document.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    expect(await screen.findByTestId('grid')).toHaveTextContent('d1');
    expect(mockGet).toHaveBeenCalledWith('personal');
  });

  it('shows the saved layout over the defaults', async () => {
    mockGet.mockResolvedValue({ widgets: savedWidgets, version: 4 });
    renderIt();
    expect(await screen.findByText('s1')).toBeInTheDocument();
  });

  it('hides the toolbar when the user cannot edit', async () => {
    mockGet.mockResolvedValue(null);
    renderIt({ canEdit: false });
    await screen.findByTestId('grid');
    expect(screen.queryByRole('button', { name: 'Customize dashboard' })).not.toBeInTheDocument();
    expect(screen.getByTestId('grid')).toHaveAttribute('data-editing', 'false');
  });

  it('does not fetch when disabled', () => {
    renderIt({ enabled: false });
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('enters edit mode and cancel discards the draft', async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValue(null);
    renderIt();
    await user.click(await screen.findByRole('button', { name: 'Customize dashboard' }));
    expect(screen.getByTestId('grid')).toHaveAttribute('data-editing', 'true');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByTestId('grid')).toHaveAttribute('data-editing', 'false');
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('adds a widget to the draft', async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValue(null);
    renderIt();
    await user.click(await screen.findByRole('button', { name: 'Customize dashboard' }));
    await user.click(screen.getByRole('button', { name: /Add widget/ }));
    await user.click(screen.getByRole('button', { name: 'pick-widget' }));
    expect(screen.getByTestId('grid').textContent).toMatch(/^d1,w/);
  });

  it('saves the draft with the loaded version and confirms', async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValue({ widgets: savedWidgets, version: 7 });
    mockSave.mockResolvedValue({ widgets: savedWidgets, version: 8 });
    renderIt({ scope: 'acme' });
    await user.click(await screen.findByRole('button', { name: 'Customize dashboard' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(mockSave).toHaveBeenCalledWith('acme', savedWidgets, 7));
    expect(await screen.findByText('Dashboard saved.')).toBeInTheDocument();
    expect(screen.getByTestId('grid')).toHaveAttribute('data-editing', 'false');
  });

  it('sends an undefined version when the layout was never saved', async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValue(null);
    mockSave.mockResolvedValue({ widgets: defaults, version: 1 });
    renderIt();
    await user.click(await screen.findByRole('button', { name: 'Customize dashboard' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(mockSave).toHaveBeenCalledWith('personal', defaults, undefined));
  });

  it('on a 409 conflict leaves edit mode and reloads the latest copy', async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValue({ widgets: savedWidgets, version: 1 });
    mockSave.mockRejectedValue(httpError(409));
    renderIt();
    await user.click(await screen.findByRole('button', { name: 'Customize dashboard' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Someone else changed this dashboard. Showing the latest version.')).toBeInTheDocument();
    expect(screen.getByTestId('grid')).toHaveAttribute('data-editing', 'false');
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2));
  });

  it('on a 403 keeps the draft and explains', async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValue(null);
    mockSave.mockRejectedValue(httpError(403));
    renderIt();
    await user.click(await screen.findByRole('button', { name: 'Customize dashboard' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText("You don't have permission to change this dashboard.")).toBeInTheDocument();
    expect(screen.getByTestId('grid')).toHaveAttribute('data-editing', 'true');
  });

  it('on a 400 names the refused field and keeps the draft', async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValue(null);
    mockSave.mockRejectedValue(httpError(400, { errors: [{ field: 'widgets.0.w', message: 'bad width' }] }));
    renderIt();
    await user.click(await screen.findByRole('button', { name: 'Customize dashboard' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText("The server didn't accept this layout (widgets.0.w: bad width).")).toBeInTheDocument();
    expect(screen.getByTestId('grid')).toHaveAttribute('data-editing', 'true');
  });

  it('on any other failure shows a generic message', async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValue(null);
    mockSave.mockRejectedValue(new Error('network'));
    renderIt();
    await user.click(await screen.findByRole('button', { name: 'Customize dashboard' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText("Couldn't save the dashboard. Check your connection and try again.")).toBeInTheDocument();
  });

  it('resets to the default layout', async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValue({ widgets: savedWidgets, version: 2 });
    mockReset.mockResolvedValue(undefined);
    renderIt();
    await user.click(await screen.findByRole('button', { name: 'Customize dashboard' }));
    await user.click(screen.getByRole('button', { name: 'More dashboard options' }));
    await user.click(screen.getByRole('menuitem', { name: /Reset to default/ }));
    await waitFor(() => expect(mockReset).toHaveBeenCalledWith('personal'));
    expect(await screen.findByText('Dashboard reset to the default layout.')).toBeInTheDocument();
    expect(screen.getByTestId('grid')).toHaveTextContent('d1');
  });

  it('empty layout message mentions Customize only for editors', async () => {
    mockGet.mockResolvedValue({ widgets: [], version: 1 });
    renderIt();
    expect(await screen.findByText(/Click Customize, then Add widget/)).toBeInTheDocument();
  });
});
