/**
 * Tests: DangerZoneSection — export request flow, status-driven rendering (queued/processing
 * shows "preparing", completed shows Download, failed shows the safe error message + retry),
 * Delete account opens DeleteWorkspaceModal
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockRequestWorkspaceExport = vi.fn();
const mockGetExportStatus = vi.fn();
const mockGetExportFileBlobUrl = vi.fn();
vi.mock('@/services/settings', () => ({
  settingsService: {
    requestWorkspaceExport: (...args: unknown[]) => mockRequestWorkspaceExport(...args),
    getExportStatus: (...args: unknown[]) => mockGetExportStatus(...args),
    getExportFileBlobUrl: (...args: unknown[]) => mockGetExportFileBlobUrl(...args),
  },
}));

const mockToast = vi.fn();
vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// DeleteWorkspaceModal has its own dedicated test file — mocked here so this file stays focused
// on the export flow and the Delete button's wiring, not the modal's own reauth/confirm logic.
vi.mock('@/components/settings/DeleteWorkspaceModal', () => ({
  DeleteWorkspaceModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="delete-workspace-modal" /> : null,
}));

import { DangerZoneSection } from '@/components/settings/DangerZoneSection';

function renderSection(props: Partial<React.ComponentProps<typeof DangerZoneSection>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <DangerZoneSection workspaceName="Acme Workspace" {...props} />
    </QueryClientProvider>
  );
}

async function startExport() {
  fireEvent.click(screen.getByRole('button', { name: 'Export your data' }));
  fireEvent.click(screen.getByRole('button', { name: 'Start export' }));
  await waitFor(() => expect(mockRequestWorkspaceExport).toHaveBeenCalled());
}

describe('DangerZoneSection', () => {
  beforeEach(() => {
    mockRequestWorkspaceExport.mockReset();
    mockGetExportStatus.mockReset();
    mockGetExportFileBlobUrl.mockReset();
    mockToast.mockReset();
  });

  it('requests an export on confirm and shows the "preparing" status while queued', async () => {
    mockRequestWorkspaceExport.mockResolvedValue({ id: 'job-1', status: 'queued', expiresAt: '' });
    mockGetExportStatus.mockResolvedValue({ id: 'job-1', status: 'queued', expiresAt: '' });
    renderSection();

    await startExport();
    expect(await screen.findByText('Preparing your export…')).toBeInTheDocument();
  });

  it('shows the Download action once the polled status reports completed', async () => {
    mockRequestWorkspaceExport.mockResolvedValue({ id: 'job-1', status: 'queued', expiresAt: '' });
    mockGetExportStatus.mockResolvedValue({ id: 'job-1', status: 'completed', expiresAt: '' });
    renderSection();

    await startExport();

    expect(await screen.findByRole('button', { name: /Download export/ })).toBeInTheDocument();
    expect(screen.queryByText('Preparing your export…')).not.toBeInTheDocument();
  });

  it('downloads the file when Download is clicked', async () => {
    mockRequestWorkspaceExport.mockResolvedValue({ id: 'job-1', status: 'queued', expiresAt: '' });
    mockGetExportStatus.mockResolvedValue({ id: 'job-1', status: 'completed', expiresAt: '' });
    mockGetExportFileBlobUrl.mockResolvedValue('blob:mock-url');
    renderSection();

    await startExport();
    fireEvent.click(await screen.findByRole('button', { name: /Download export/ }));

    await waitFor(() => expect(mockGetExportFileBlobUrl).toHaveBeenCalledWith('job-1'));
  });

  it('shows the safe error message and a Try again action when the polled status reports failed', async () => {
    mockRequestWorkspaceExport.mockResolvedValue({ id: 'job-1', status: 'queued', expiresAt: '' });
    mockGetExportStatus.mockResolvedValue({ id: 'job-1', status: 'failed', expiresAt: '' });
    renderSection();

    await startExport();

    expect(await screen.findByText('Something went wrong preparing your export.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('"Try again" resets back to the Export your data entry point', async () => {
    mockRequestWorkspaceExport.mockResolvedValue({ id: 'job-1', status: 'queued', expiresAt: '' });
    mockGetExportStatus.mockResolvedValue({ id: 'job-1', status: 'failed', expiresAt: '' });
    renderSection();

    await startExport();
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('button', { name: 'Export your data' })).toBeInTheDocument();
  });

  describe('when the status check itself fails', () => {
    const job = (status: string) => ({ id: 'job-1', status, expiresAt: '' });

    it('says so with a Try again action, instead of "Preparing" forever', async () => {
      mockRequestWorkspaceExport.mockResolvedValue(job('queued'));
      mockGetExportStatus.mockRejectedValue(new Error('Network Error'));
      renderSection();

      await startExport();

      expect(await screen.findByText("Couldn't check on your export.")).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
      expect(screen.queryByText('Preparing your export…')).not.toBeInTheDocument();
    });

    it('"Try again" checks the same export again, without starting a new one', async () => {
      mockRequestWorkspaceExport.mockResolvedValue(job('queued'));
      mockGetExportStatus.mockRejectedValueOnce(new Error('Network Error')).mockResolvedValue(job('completed'));
      renderSection();

      await startExport();
      fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));

      expect(await screen.findByRole('button', { name: /Download export/ })).toBeInTheDocument();
      expect(mockGetExportStatus).toHaveBeenLastCalledWith('job-1');
      expect(mockRequestWorkspaceExport).toHaveBeenCalledTimes(1);
    });

    it('also after earlier checks worked: stops polling, shows the error, and resumes after Try again', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      mockRequestWorkspaceExport.mockResolvedValue(job('queued'));
      mockGetExportStatus.mockResolvedValueOnce(job('processing')).mockRejectedValueOnce(new Error('502')).mockResolvedValue(job('processing'));
      renderSection();
      const wait = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

      await startExport();
      await screen.findByText('Preparing your export…');
      await wait(5_100);
      expect(await screen.findByText("Couldn't check on your export.")).toBeInTheDocument();
      await wait(60_000);
      expect(mockGetExportStatus).toHaveBeenCalledTimes(2);

      fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
      expect(await screen.findByText('Preparing your export…')).toBeInTheDocument();
      await wait(5_100);
      expect(mockGetExportStatus).toHaveBeenCalledTimes(4);
      vi.useRealTimers();
    });
  });

  it('opens DeleteWorkspaceModal when Delete account is clicked', () => {
    renderSection();

    expect(screen.queryByTestId('delete-workspace-modal')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete account' }));
    expect(screen.getByTestId('delete-workspace-modal')).toBeInTheDocument();
  });

  it('says "Export your data" once (the button), not as a heading plus an identical button', () => {
    renderSection();
    expect(screen.getAllByText('Export your data')).toHaveLength(1);
    expect(screen.getByText(/Download a copy of your forms and responses first/)).toBeInTheDocument();
  });
});
