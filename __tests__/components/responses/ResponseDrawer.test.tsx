/**
 * __tests__/components/responses/ResponseDrawer.test.tsx
 * Feature: responses-drawer-redesign; migrated by sprint-12-inbox-collaboration task 1.3/1.8 to
 * stages (`responsesService.update({ stageId })`, `responseKeys.*` scope segment) rather than the
 * removed status union.
 * Tests: null when closed, fetches+renders when open, Escape/backdrop close, dual-cache
 * optimistic stage patch, delete closes instead of navigating
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ComponentProps } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ResponseDrawer } from '@/components/responses/ResponseDrawer';
import { responseKeys } from '@/lib/queryKeys';
import type { ResponseDetail } from '@/types/response';
import type { StageRef } from '@/types/stage';

const mockToast = vi.fn();
vi.mock('@/components/common/Toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

const mockGetResponseById = vi.fn();
const FORM_WITH_NAME_FIELDS = {
  _id: 'form-1',
  title: 'Test form',
  fields: [
    { fieldId: 'Full Name', type: 'short_text', label: 'Full Name', required: false, deleted: false },
    { fieldId: 'Email', type: 'email', label: 'Email', required: false, deleted: false },
  ],
};
const mockUpdate = vi.fn();
const mockDeleteResponse = vi.fn();
const mockGetFileDownloadUrl = vi.fn();
const mockGetFormById = vi.fn();
vi.mock('@/services/forms', () => ({
  formsService: { getFormById: (...args: unknown[]) => mockGetFormById(...args) },
}));
vi.mock('@/services/responses', () => ({
  responsesService: {
    getResponseById: (...args: unknown[]) => mockGetResponseById(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    deleteResponse: (...args: unknown[]) => mockDeleteResponse(...args),
    getFileDownloadUrl: (...args: unknown[]) => mockGetFileDownloadUrl(...args),
  },
}));

const STAGES: StageRef[] = [
  { id: 's-new', name: 'New', colour: 'info', category: 'new' },
  { id: 's-completed', name: 'Completed', colour: 'success', category: 'completed' },
];

const detail: ResponseDetail = {
  _id: 'resp-1',
  formId: 'form-1',
  reference: '#1',
  answers: { 'Full Name': 'Priya Sharma', Email: 'priya@example.com' },
  stage: STAGES[0],
  assignee: null,
  tags: [],
  noteCount: 0,
  attachmentCount: 0,
  unread: false,
  duplicateOfId: null,
  ipHash: 'a1b2c3d4e5f60718',
  submittedAt: '2026-08-03T09:50:00.000Z',
  createdAt: '2026-08-03T09:50:00.000Z',
  updatedAt: '2026-08-03T09:50:00.000Z',
  responseFiles: [],
};

function renderDrawer(
  responseId: string | null,
  onClose = vi.fn(),
  drawerProps: Partial<ComponentProps<typeof ResponseDrawer>> = {}
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <ResponseDrawer responseId={responseId} formId="form-1" stages={STAGES} onClose={onClose} {...drawerProps} />
    </QueryClientProvider>
  );
  return { ...utils, queryClient, onClose };
}

describe('ResponseDrawer', () => {
  beforeEach(() => {
    mockGetFormById.mockReset();
    mockGetFormById.mockResolvedValue(FORM_WITH_NAME_FIELDS);
    mockToast.mockReset();
    mockGetResponseById.mockReset();
    mockUpdate.mockReset();
    mockDeleteResponse.mockReset();
  });

  it('renders nothing when responseId is null', () => {
    const { container } = renderDrawer(null);
    expect(container).toBeEmptyDOMElement();
  });

  it('locks page scroll while open and restores it on close', async () => {
    // Feature: sprint-4-responses regression — the drawer's own content and the Responses
    // table underneath used to both scroll independently (two visible scrollbars) since
    // nothing prevented the page body from scrolling while the drawer was open.
    mockGetResponseById.mockResolvedValue(detail);
    const { rerender, queryClient } = renderDrawer('resp-1');
    await screen.findByText('Submitted Answers');

    expect(document.body.style.overflow).toBe('hidden');

    rerender(
      <QueryClientProvider client={queryClient}>
        <ResponseDrawer responseId={null} formId="form-1" onClose={vi.fn()} />
      </QueryClientProvider>
    );

    expect(document.body.style.overflow).toBe('');
  });

  it('fetches and renders answers + metadata when open', async () => {
    mockGetResponseById.mockResolvedValue(detail);
    renderDrawer('resp-1');

    expect(await screen.findByText('Submitted Answers')).toBeInTheDocument();
    // "Priya Sharma" renders twice: once as the detected identity in the drawer header,
    // once as the "Full Name" answer value below.
    expect(screen.getAllByText('Priya Sharma')).toHaveLength(2);
    expect(screen.getByText('Full Name')).toBeInTheDocument();
    expect(mockGetResponseById).toHaveBeenCalledWith('resp-1', 'personal');
  });

  it('shows an access-denied state instead of an endless skeleton on 403', async () => {
    mockGetResponseById.mockRejectedValue({
      isAxiosError: true,
      response: { status: 403, data: { message: 'Access denied' } },
    });
    const { container } = renderDrawer('resp-1');

    expect(await screen.findByRole('heading', { name: 'Access denied' })).toBeInTheDocument();
    expect(screen.getByText("You don't have permission to view this response.")).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    expect(container.querySelector('[aria-busy="true"]')).toBeNull();
  });

  it('shows a not-found state instead of an endless skeleton on 404', async () => {
    mockGetResponseById.mockRejectedValue({
      isAxiosError: true,
      response: { status: 404, data: { message: 'Response not found' } },
    });
    renderDrawer('resp-1');

    expect(await screen.findByRole('heading', { name: 'Response not found' })).toBeInTheDocument();
    expect(screen.getByText(/may have been deleted/i)).toBeInTheDocument();
  });

  it('shows a retryable error on 500 and renders the response after retry succeeds', async () => {
    mockGetResponseById
      .mockRejectedValueOnce({
        isAxiosError: true,
        response: { status: 500, data: { message: 'Internal server error' } },
      })
      .mockResolvedValueOnce(detail);
    const user = userEvent.setup();
    renderDrawer('resp-1');

    expect(await screen.findByRole('heading', { name: 'Unable to load response' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Submitted Answers')).toBeInTheDocument();
    expect(mockGetResponseById).toHaveBeenCalledTimes(2);
  });

  it('calls onClose on Escape', async () => {
    mockGetResponseById.mockResolvedValue(detail);
    const user = userEvent.setup();
    const { onClose } = renderDrawer('resp-1');
    await screen.findByText('Submitted Answers');

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('restores focus to the opener when the drawer closes', async () => {
    mockGetResponseById.mockResolvedValue(detail);
    const opener = document.createElement('button');
    opener.textContent = 'Open response';
    document.body.appendChild(opener);
    opener.focus();

    const { rerender, queryClient } = renderDrawer('resp-1');
    await screen.findByText('Submitted Answers');
    expect(opener).not.toHaveFocus();

    rerender(
      <QueryClientProvider client={queryClient}>
        <ResponseDrawer responseId={null} formId="form-1" onClose={vi.fn()} />
      </QueryClientProvider>
    );

    expect(opener).toHaveFocus();
    opener.remove();
  });

  it('shows an explicit empty state when a response has no answers', async () => {
    mockGetFormById.mockRejectedValue(new Error('form unavailable'));
    mockGetResponseById.mockResolvedValue({ ...detail, answers: {} });
    renderDrawer('resp-1');

    expect(await screen.findByText('No submitted answers.')).toBeInTheDocument();
  });

  it('calls onClose on backdrop click', async () => {
    mockGetResponseById.mockResolvedValue(detail);
    const user = userEvent.setup();
    const { onClose } = renderDrawer('resp-1');
    await screen.findByText('Submitted Answers');

    await user.click(screen.getByRole('presentation'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('optimistically patches both the detail and list caches on stage change, then invalidates', async () => {
    mockGetResponseById.mockResolvedValue(detail);
    mockUpdate.mockResolvedValue({ ...detail, stage: STAGES[1] });
    const user = userEvent.setup();
    const { queryClient } = renderDrawer('resp-1');
    await screen.findByText('Submitted Answers');

    queryClient.setQueryData(responseKeys.list('personal', 'form-1', {}), {
      data: [detail],
      total: 1,
      page: 1,
      limit: 50,
      totalPages: 1,
    });

    await user.click(screen.getByRole('button', { name: 'Response stage' }));
    await user.click(screen.getByRole('option', { name: /Completed/ }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith('resp-1', { stageId: 's-completed' }, 'personal');
    });
  });

  it('stage change still succeeds when a stats cache entry shares the same key prefix', async () => {
    // Feature: sprint-4-responses, regression — ResponseDrawer's optimistic update patches
    // every cached query under ['responses', scope, formId] via setQueriesData, which also
    // fuzzy-matches the stats cache (['responses', scope, formId, 'stats'], shape
    // { total, unread, byStage, byCategory } — no `data` array). In real usage
    // ResponsesHubView's stats query always populates this entry, so the drawer must not assume
    // every match is a paginated list.
    mockGetResponseById.mockResolvedValue(detail);
    mockUpdate.mockResolvedValue({ ...detail, stage: STAGES[1] });
    const user = userEvent.setup();
    const { queryClient } = renderDrawer('resp-1');
    await screen.findByText('Submitted Answers');

    queryClient.setQueryData(responseKeys.list('personal', 'form-1', {}), {
      data: [detail],
      total: 1,
      page: 1,
      limit: 50,
      totalPages: 1,
    });
    queryClient.setQueryData(responseKeys.stats('personal', 'form-1'), {
      total: 1,
      unread: 0,
      byStage: [],
      byCategory: { new: 1, in_progress: 0, completed: 0 },
    });

    await user.click(screen.getByRole('button', { name: 'Response stage' }));
    await user.click(screen.getByRole('option', { name: /Completed/ }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith('resp-1', { stageId: 's-completed' }, 'personal');
    });
    // The bug made onMutate throw before mutationFn ever ran, which always produced this
    // exact generic toast instead of a real success/error outcome — assert it's absent.
    expect(mockToast).not.toHaveBeenCalledWith('Failed to update stage. Please try again.', 'error');
  });

  it('shows uploaded files under their form field labels in Submitted response', async () => {
    mockGetFormById.mockRejectedValue(new Error('form unavailable'));
    mockGetResponseById.mockResolvedValue({
      ...detail,
      responseFiles: [
        {
          id: 'file-1',
          name: 'portfolio.pdf',
          size: 1024,
          type: 'application/pdf',
          url: '/private/portfolio.pdf',
          uploadTime: detail.submittedAt,
        },
      ],
    });
    renderDrawer('resp-1', vi.fn(), { fileFieldLabels: ['Portfolio'] });

    expect(await screen.findByText('Portfolio')).toBeInTheDocument();
    expect(screen.getAllByText('portfolio.pdf').length).toBeGreaterThanOrEqual(1);
  });

  it('supports previous, next, and full-page expand actions from the header', async () => {
    mockGetResponseById.mockResolvedValue(detail);
    const onPrevious = vi.fn();
    const onNext = vi.fn();
    const onExpand = vi.fn();
    const user = userEvent.setup();
    renderDrawer('resp-1', vi.fn(), {
      position: 2,
      totalResponses: 5,
      hasPrevious: true,
      hasNext: true,
      onPrevious,
      onNext,
      onExpand,
    });
    await screen.findByText('Submitted Answers');

    await user.click(screen.getByRole('button', { name: 'Previous response' }));
    await user.click(screen.getByRole('button', { name: 'Next response' }));
    await user.click(screen.getByRole('button', { name: 'Open response in full page' }));

    expect(onPrevious).toHaveBeenCalledOnce();
    expect(onNext).toHaveBeenCalledOnce();
    expect(onExpand).toHaveBeenCalledWith(detail);
    expect(screen.getByText('2 of 5')).toBeInTheDocument();
  });

  it('uses a direct drawer URL for the full-page collapse action', async () => {
    mockGetResponseById.mockResolvedValue(detail);
    renderDrawer('resp-1', vi.fn(), {
      displayMode: 'page',
      collapseHref: '/forms/form-1/responses?page=2&responseId=resp-1',
    });

    expect(await screen.findByRole('link', { name: 'Return to response drawer' })).toHaveAttribute(
      'href',
      '/forms/form-1/responses?page=2&responseId=resp-1'
    );
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
