/**
 * __tests__/components/settings/DangerZoneSection.test.tsx
 * Feature: sprint-6-settings
 * Tests: DangerZoneSection — export request flow, status-driven rendering (queued/processing
 * shows "preparing", completed shows Download, failed shows the safe error message + retry),
 * Delete Workspace opens DeleteWorkspaceModal
 * Requirements: 10.1-10.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
vi.mock('@/components/common/Toast', () => ({
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
  fireEvent.click(screen.getByRole('button', { name: 'Export Workspace Data' }));
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

  it('"Try again" resets back to the Export Workspace Data entry point', async () => {
    mockRequestWorkspaceExport.mockResolvedValue({ id: 'job-1', status: 'queued', expiresAt: '' });
    mockGetExportStatus.mockResolvedValue({ id: 'job-1', status: 'failed', expiresAt: '' });
    renderSection();

    await startExport();
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('button', { name: 'Export Workspace Data' })).toBeInTheDocument();
  });

  it('opens DeleteWorkspaceModal when Delete Workspace is clicked', () => {
    renderSection();

    expect(screen.queryByTestId('delete-workspace-modal')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete Workspace' }));
    expect(screen.getByTestId('delete-workspace-modal')).toBeInTheDocument();
  });
});
