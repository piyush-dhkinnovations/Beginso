/**
 * __tests__/components/settings/DangerZoneSection.test.tsx
 * Feature: sprint-6-settings
 * Tests: DangerZoneSection — export request flow, status transitions (queued → completed shows
 * Download, queued → failed shows an error), Delete Workspace opens DeleteWorkspaceModal
 * Requirements: 10.1-10.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockRequestWorkspaceExport = vi.fn();
const mockGetExportFileBlobUrl = vi.fn();
vi.mock('@/services/settings', () => ({
  settingsService: {
    requestWorkspaceExport: (...args: unknown[]) => mockRequestWorkspaceExport(...args),
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

function makeAxiosError(status: number) {
  const error = new Error('request failed') as Error & { isAxiosError: boolean; response: { status: number } };
  error.isAxiosError = true;
  error.response = { status };
  return error;
}

function renderSection(props: Partial<React.ComponentProps<typeof DangerZoneSection>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <DangerZoneSection workspaceName="Acme Workspace" {...props} />
    </QueryClientProvider>
  );
}

describe('DangerZoneSection', () => {
  beforeEach(() => {
    mockRequestWorkspaceExport.mockReset();
    mockGetExportFileBlobUrl.mockReset();
    mockToast.mockReset();
  });

  it('requests an export on confirm and shows the "preparing" status', async () => {
    mockRequestWorkspaceExport.mockResolvedValue({ id: 'job-1', status: 'queued', expiresAt: '' });
    renderSection();

    fireEvent.click(screen.getByRole('button', { name: 'Export Workspace Data' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start export' }));

    await waitFor(() => expect(mockRequestWorkspaceExport).toHaveBeenCalled());
    expect(await screen.findByText('Preparing your export…')).toBeInTheDocument();
  });

  it('queued → completed: a successful readiness check shows the Download action', async () => {
    mockRequestWorkspaceExport.mockResolvedValue({ id: 'job-1', status: 'queued', expiresAt: '' });
    mockGetExportFileBlobUrl.mockResolvedValue('blob:mock-url');
    renderSection();

    fireEvent.click(screen.getByRole('button', { name: 'Export Workspace Data' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start export' }));
    await screen.findByText('Preparing your export…');

    fireEvent.click(screen.getByRole('button', { name: 'Check if ready' }));

    expect(await screen.findByRole('button', { name: /Download export/ })).toBeInTheDocument();
    expect(screen.queryByText('Preparing your export…')).not.toBeInTheDocument();
  });

  it('queued → queued: a 404 readiness check keeps it in the preparing state, not an error', async () => {
    mockRequestWorkspaceExport.mockResolvedValue({ id: 'job-1', status: 'queued', expiresAt: '' });
    mockGetExportFileBlobUrl.mockRejectedValue(makeAxiosError(404));
    renderSection();

    fireEvent.click(screen.getByRole('button', { name: 'Export Workspace Data' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start export' }));
    await screen.findByText('Preparing your export…');

    fireEvent.click(screen.getByRole('button', { name: 'Check if ready' }));

    await waitFor(() => expect(mockGetExportFileBlobUrl).toHaveBeenCalled());
    expect(screen.getByText('Preparing your export…')).toBeInTheDocument();
  });

  it('queued → failed: a non-404 readiness-check error shows the safe error message', async () => {
    mockRequestWorkspaceExport.mockResolvedValue({ id: 'job-1', status: 'queued', expiresAt: '' });
    mockGetExportFileBlobUrl.mockRejectedValue(makeAxiosError(500));
    renderSection();

    fireEvent.click(screen.getByRole('button', { name: 'Export Workspace Data' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start export' }));
    await screen.findByText('Preparing your export…');

    fireEvent.click(screen.getByRole('button', { name: 'Check if ready' }));

    expect(await screen.findByText('Something went wrong preparing your export.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('opens DeleteWorkspaceModal when Delete Workspace is clicked', () => {
    renderSection();

    expect(screen.queryByTestId('delete-workspace-modal')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete Workspace' }));
    expect(screen.getByTestId('delete-workspace-modal')).toBeInTheDocument();
  });
});
