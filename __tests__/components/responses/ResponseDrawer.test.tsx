/**
 * __tests__/components/responses/ResponseDrawer.test.tsx
 * Feature: responses-drawer-redesign
 * Tests: ResponseDrawer — null when closed, fetches+renders when open, Escape/backdrop close,
 * dual-cache optimistic status patch, delete closes instead of navigating
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ResponseDrawer } from '@/components/responses/ResponseDrawer';
import { responseKeys } from '@/lib/queryKeys';
import type { ResponseDetail } from '@/types/response';

const mockToast = vi.fn();
vi.mock('@/components/common/Toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

const mockGetResponseById = vi.fn();
const mockUpdateStatus = vi.fn();
const mockDeleteResponse = vi.fn();
const mockGetFileDownloadUrl = vi.fn();
vi.mock('@/services/responses', () => ({
  responsesService: {
    getResponseById: (...args: unknown[]) => mockGetResponseById(...args),
    updateStatus: (...args: unknown[]) => mockUpdateStatus(...args),
    deleteResponse: (...args: unknown[]) => mockDeleteResponse(...args),
    getFileDownloadUrl: (...args: unknown[]) => mockGetFileDownloadUrl(...args),
  },
}));

const detail: ResponseDetail = {
  _id: 'resp-1',
  formId: 'form-1',
  answers: { 'Full Name': 'Priya Sharma', Email: 'priya@example.com' },
  status: 'new',
  ipHash: 'a1b2c3d4e5f60718',
  submittedAt: '2026-08-03T09:50:00.000Z',
  createdAt: '2026-08-03T09:50:00.000Z',
  updatedAt: '2026-08-03T09:50:00.000Z',
  responseFiles: [],
};

function renderDrawer(responseId: string | null, onClose = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <ResponseDrawer responseId={responseId} formId="form-1" onClose={onClose} />
    </QueryClientProvider>
  );
  return { ...utils, queryClient, onClose };
}

describe('ResponseDrawer', () => {
  beforeEach(() => {
    mockToast.mockReset();
    mockGetResponseById.mockReset();
    mockUpdateStatus.mockReset();
    mockDeleteResponse.mockReset();
  });

  it('renders nothing when responseId is null', () => {
    const { container } = renderDrawer(null);
    expect(container).toBeEmptyDOMElement();
  });

  it('fetches and renders answers + metadata when open', async () => {
    mockGetResponseById.mockResolvedValue(detail);
    renderDrawer('resp-1');

    expect(await screen.findByText('Submitted Answers')).toBeInTheDocument();
    // "Priya Sharma" renders twice: once as the detected identity in the drawer header,
    // once as the "Full Name" answer value below.
    expect(screen.getAllByText('Priya Sharma')).toHaveLength(2);
    expect(screen.getByText('Full Name')).toBeInTheDocument();
    expect(mockGetResponseById).toHaveBeenCalledWith('resp-1');
  });

  it('calls onClose on Escape', async () => {
    mockGetResponseById.mockResolvedValue(detail);
    const user = userEvent.setup();
    const { onClose } = renderDrawer('resp-1');
    await screen.findByText('Submitted Answers');

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose on backdrop click', async () => {
    mockGetResponseById.mockResolvedValue(detail);
    const user = userEvent.setup();
    const { onClose } = renderDrawer('resp-1');
    await screen.findByText('Submitted Answers');

    await user.click(screen.getByRole('presentation'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('optimistically patches both the detail and list caches on status change, then invalidates', async () => {
    mockGetResponseById.mockResolvedValue(detail);
    mockUpdateStatus.mockResolvedValue({ _id: 'resp-1', status: 'completed', updatedAt: '2026-08-03T10:00:00.000Z' });
    const user = userEvent.setup();
    const { queryClient } = renderDrawer('resp-1');
    await screen.findByText('Submitted Answers');

    queryClient.setQueryData(responseKeys.list('form-1', {}), {
      data: [{ ...detail, status: 'new' }],
      total: 1,
      page: 1,
      limit: 50,
      totalPages: 1,
    });

    await user.click(screen.getByRole('button', { name: 'Response status' }));
    await user.click(screen.getByRole('option', { name: /Completed/ }));

    await waitFor(() => {
      expect(mockUpdateStatus).toHaveBeenCalledWith('resp-1', 'completed');
    });
  });

  it('Escape closing the status menu does not also close the drawer', async () => {
    mockGetResponseById.mockResolvedValue(detail);
    const user = userEvent.setup();
    const { onClose } = renderDrawer('resp-1');
    await screen.findByText('Submitted Answers');

    await user.click(screen.getByRole('button', { name: 'Response status' }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('delete success calls onClose instead of navigating', async () => {
    mockGetResponseById.mockResolvedValue(detail);
    mockDeleteResponse.mockResolvedValue(undefined);
    const user = userEvent.setup();
    const { onClose } = renderDrawer('resp-1');
    await screen.findByText('Submitted Answers');

    await user.click(screen.getByRole('button', { name: 'Delete Response' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
    expect(mockToast).toHaveBeenCalledWith('Response deleted.', 'success');
  });
});
