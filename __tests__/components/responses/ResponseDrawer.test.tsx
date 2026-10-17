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
import { reportsService } from '@/services/reports';
import type { ResponseDetail } from '@/types/response';
import type { StageRef } from '@/types/stage';

// Unmocked services (tags, members, workspaces, notifications...) would hit the real axios
// instance, whose 401 interceptor fetches a relative logout URL (invalid under jsdom/node).
vi.mock('@/lib/axios', () => {
  const ok = () => Promise.resolve({ data: [] });
  return { default: { get: ok, post: ok, put: ok, patch: ok, delete: ok } };
});

const mockToast = vi.fn();
vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Sprint 12 (inbox-collaboration), task 4.4: ResponseDrawer now renders NotesPanel and
// WorkflowSidebar's ActivityTimeline unconditionally, both of which fetch on mount — mocked here
// so this suite (which only exercises the drawer's own header/answers/delete/navigation behaviour)
// doesn't make real network calls. useAuth is required unconditionally by NotesPanel's
// `currentUserId` prop.
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'user@example.com' } }),
}));
vi.mock('@/services/notes', () => ({
  notesService: {
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
  MentionAccessError: class MentionAccessError extends Error {},
}));
vi.mock('@/services/activity', () => ({
  activityService: { list: vi.fn().mockResolvedValue([]) },
}));
// Whether a personal form is shared with anyone decides if notes/assignee/activity show at all.
const mockListGrants = vi.fn();
vi.mock('@/services/formAccess', () => ({
  formAccessService: { listGrants: (...args: unknown[]) => mockListGrants(...args), addGrant: vi.fn(), removeGrant: vi.fn() },
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
    markRead: vi.fn().mockResolvedValue(undefined),
    bulk: vi.fn(),
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
    mockListGrants.mockReset().mockResolvedValue([]); // default: a personal form shared with nobody
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
    await screen.findByText('Submitted response');

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

    expect(await screen.findByText('Submitted response')).toBeInTheDocument();
    // "Priya Sharma" renders twice: once as the detected identity in the drawer header,
    // once as the "Full Name" answer value below.
    // Answers render once the drawer has the form definition (or its lookup has failed), and are
    // numbered by position ("1. Full Name"), so wait for the label first.
    expect(await screen.findByText(/Full Name/)).toBeInTheDocument();
    expect(screen.getAllByText('Priya Sharma')).toHaveLength(2);
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

    expect(await screen.findByText('Submitted response')).toBeInTheDocument();
    expect(mockGetResponseById).toHaveBeenCalledTimes(2);
  });

  it('calls onClose on Escape', async () => {
    mockGetResponseById.mockResolvedValue(detail);
    const user = userEvent.setup();
    const { onClose } = renderDrawer('resp-1');
    await screen.findByText('Submitted response');

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
    await screen.findByText('Submitted response');
    expect(opener).not.toHaveFocus();

    rerender(
      <QueryClientProvider client={queryClient}>
        <ResponseDrawer responseId={null} formId="form-1" onClose={vi.fn()} />
      </QueryClientProvider>
    );

    expect(opener).toHaveFocus();
    opener.remove();
  });

  // QA D5-005: opening by keyboard left focus on the row behind the overlay while the response was still loading.
  it('moves focus into the drawer on open, even before the response has loaded', async () => {
    mockGetResponseById.mockReturnValue(new Promise(() => {})); // never resolves: the loading state
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();

    renderDrawer('resp-1');
    const dialog = await screen.findByRole('dialog');
    expect(opener).not.toHaveFocus();
    expect(dialog.contains(document.activeElement)).toBe(true);
    opener.remove();
  });

  // The real cause of D5-005, found on the live page: the first control in the DOM is the mobile-only Back button, display:none on
  // desktop, and focus() on a hidden element does nothing. Focus must go to the first control that is actually visible.
  it('skips a hidden first control (the mobile-only Back button) when moving focus into the drawer', async () => {
    mockGetResponseById.mockResolvedValue(detail);
    const original = HTMLElement.prototype.checkVisibility;
    HTMLElement.prototype.checkVisibility = function (this: HTMLElement) {
      return this.getAttribute('aria-label') !== 'Back';
    };
    try {
      const opener = document.createElement('button');
      document.body.appendChild(opener);
      opener.focus();
      renderDrawer('resp-1', vi.fn(), { onPrevious: vi.fn(), hasPrevious: true });
      const dialog = await screen.findByRole('dialog');
      await screen.findByText('Submitted response');
      const hiddenBack = dialog.querySelector('[aria-label="Back"]');
      expect(document.activeElement).not.toBe(hiddenBack);
      expect(dialog.contains(document.activeElement)).toBe(true);
      opener.remove();
    } finally {
      HTMLElement.prototype.checkVisibility = original;
    }
  });

  // QA D5-007: a response with no stage of its own (every response created before it started in a default stage) read
  // "Unknown stage" in the drawer. It now shows the stage of its status.
  it('shows the stage of its status when the response has no stage of its own', async () => {
    mockGetResponseById.mockResolvedValue({ ...detail, stage: null, status: 'new' });
    renderDrawer('resp-1', vi.fn(), { scope: 'acme' });
    await screen.findByText('Submitted response');
    const select = screen.getByLabelText('Stage') as HTMLSelectElement;
    expect(select.value).toBe('s-new');
    expect(screen.queryByRole('option', { name: 'Unknown stage' })).not.toBeInTheDocument();
  });

  it('still says Unknown stage when the workspace has no stage in that category', async () => {
    mockGetResponseById.mockResolvedValue({ ...detail, stage: null, status: 'in_progress' });
    renderDrawer('resp-1', vi.fn(), { scope: 'acme' });
    await screen.findByText('Submitted response');
    expect(screen.getByRole('option', { name: 'Unknown stage' })).toBeInTheDocument();
  });

  // QA D5-002: the single-response download went out under the personal scope too, so a workspace response answered "Form not found".
  it('downloads a workspace response under that workspace scope', async () => {
    mockGetResponseById.mockResolvedValue(detail);
    const createReport = vi.spyOn(reportsService, 'createReport').mockResolvedValue({} as never);
    const user = userEvent.setup();
    renderDrawer('resp-1', vi.fn(), { scope: 'acme' });
    await screen.findByText('Submitted response');
    await user.click(screen.getByRole('button', { name: 'Download response' }));
    expect(createReport).toHaveBeenCalledWith(expect.objectContaining({ format: 'csv', ids: ['resp-1'] }), 'acme');
    createReport.mockRestore();
  });

  // QA A6-011: the parent re-creates onClose on every render. The focus effect depended on it, so each parent render
  // re-captured "the opener" from inside the drawer and pulled focus back to the first button; Esc then left focus on <body>.
  it('keeps the focus where the user put it when the parent re-renders with a new onClose, and still returns it to the opener', async () => {
    mockGetResponseById.mockResolvedValue(detail);
    const opener = document.createElement('button');
    opener.textContent = 'Open response';
    document.body.appendChild(opener);
    opener.focus();

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const ui = (responseId: string | null, onClose: () => void) => (
      <QueryClientProvider client={queryClient}>
        <ResponseDrawer responseId={responseId} formId="form-1" stages={STAGES} onClose={onClose} />
      </QueryClientProvider>
    );
    const { rerender } = render(ui('resp-1', () => undefined));
    await screen.findByText('Submitted response');

    const download = screen.getByRole('button', { name: 'Download response' });
    download.focus();
    rerender(ui('resp-1', () => undefined)); // a brand-new onClose, as the real parent produces
    rerender(ui('resp-1', () => undefined));
    expect(download).toHaveFocus(); // not stolen back to the first button

    rerender(ui(null, () => undefined)); // closed (what Esc does through the parent)
    expect(opener).toHaveFocus();
    opener.remove();
  });

  it('Escape still calls the latest onClose even though the handler is registered once', async () => {
    mockGetResponseById.mockResolvedValue(detail);
    const user = userEvent.setup();
    const first = vi.fn();
    const latest = vi.fn();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const ui = (onClose: () => void) => (
      <QueryClientProvider client={queryClient}>
        <ResponseDrawer responseId="resp-1" formId="form-1" stages={STAGES} onClose={onClose} />
      </QueryClientProvider>
    );
    const { rerender } = render(ui(first));
    await screen.findByText('Submitted response');
    rerender(ui(latest));
    await user.keyboard('{Escape}');
    expect(latest).toHaveBeenCalledOnce();
    expect(first).not.toHaveBeenCalled();
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
    await screen.findByText('Submitted response');

    await user.click(screen.getByRole('presentation'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('optimistically patches both the detail and list caches on stage change, then invalidates', async () => {
    // Explicit workspace scope: a *real* Stage-id dropdown (this fixture's STAGES) only exists
    // for a workspace — personal-shell responses use PERSONAL_DEFAULT_STAGES and send {status},
    // not {stageId} (OQ-9's "fixed default stages", Sprint 12 close-out). This test is about the
    // optimistic-cache-patch mechanism, not personal-vs-workspace stage semantics, so it exercises
    // the workspace path explicitly rather than relying on the drawer's personal-shell default.
    mockGetResponseById.mockResolvedValue(detail);
    mockUpdate.mockResolvedValue({ ...detail, stage: STAGES[1] });
    const user = userEvent.setup();
    const { queryClient } = renderDrawer('resp-1', undefined, { scope: 'acme' });
    await screen.findByText('Submitted response');

    queryClient.setQueryData(responseKeys.list('acme', 'form-1', {}), {
      data: [detail],
      total: 1,
      page: 1,
      limit: 50,
      totalPages: 1,
    });

    await user.selectOptions(screen.getByLabelText('Stage'), 'Completed');

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith('resp-1', { stageId: 's-completed' }, 'acme');
    });
  });

  it('stage change still succeeds when a stats cache entry shares the same key prefix', async () => {
    // Feature: sprint-4-responses, regression — ResponseDrawer's optimistic update patches
    // every cached query under ['responses', scope, formId] via setQueriesData, which also
    // fuzzy-matches the stats cache (['responses', scope, formId, 'stats'], shape
    // { total, unread, byStage, byCategory } — no `data` array). In real usage
    // ResponsesHubView's stats query always populates this entry, so the drawer must not assume
    // every match is a paginated list. Explicit workspace scope — see the previous test's comment.
    mockGetResponseById.mockResolvedValue(detail);
    mockUpdate.mockResolvedValue({ ...detail, stage: STAGES[1] });
    const user = userEvent.setup();
    const { queryClient } = renderDrawer('resp-1', undefined, { scope: 'acme' });
    await screen.findByText('Submitted response');

    queryClient.setQueryData(responseKeys.list('acme', 'form-1', {}), {
      data: [detail],
      total: 1,
      page: 1,
      limit: 50,
      totalPages: 1,
    });
    queryClient.setQueryData(responseKeys.stats('acme', 'form-1'), {
      total: 1,
      unread: 0,
      byStage: [],
      byCategory: { new: 1, in_progress: 0, completed: 0 },
    });

    await user.selectOptions(screen.getByLabelText('Stage'), 'Completed');

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith('resp-1', { stageId: 's-completed' }, 'acme');
    });
    // The bug made onMutate throw before mutationFn ever ran, which always produced this
    // exact generic toast instead of a real success/error outcome — assert it's absent.
    expect(mockToast).not.toHaveBeenCalledWith('Failed to update stage. Please try again.', 'error');
  });

  // The dedicated "Escape closing the stage menu doesn't also close the drawer" case is retired:
  // task 4.3 replaced the custom-listbox stage control (StatusDropdown, which owned its own
  // Escape/stopPropagation) with WorkflowSidebar's native `ui/Select`, which has no open/close JS
  // state to guard — Escape now behaves exactly like the "calls onClose on Escape" case above.

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

    // Answers are numbered by position ("1. Portfolio"), so match the label inside the heading.
    expect(await screen.findByText(/Portfolio/)).toBeInTheDocument();
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
    await screen.findByText('Submitted response');

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
    await screen.findByText('Submitted response');

    await user.click(screen.getByRole('button', { name: 'Delete response' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
    expect(mockToast).toHaveBeenCalledWith('Response deleted.', 'success');
  });

  describe('collaboration sections (notes, assignee, activity)', () => {
    it('hides them on a personal form that is shared with nobody, and offers to share it', async () => {
      mockGetResponseById.mockResolvedValue(detail);
      renderDrawer('resp-1');
      await screen.findByText('Submitted response');

      await waitFor(() => expect(screen.getByText('Working with others?')).toBeInTheDocument());
      expect(screen.queryByText('Internal notes')).not.toBeInTheDocument();
      expect(screen.queryByText('Assignee')).not.toBeInTheDocument();
      expect(screen.queryByText('Activity')).not.toBeInTheDocument();
      // Triage controls stay for everyone.
      expect(screen.getByText('Stage')).toBeInTheDocument();
      expect(screen.getByText('Tags')).toBeInTheDocument();
    });

    it('shows them on a personal form once it is shared with someone', async () => {
      mockGetResponseById.mockResolvedValue(detail);
      mockListGrants.mockResolvedValue([{ userId: 'u2', name: 'Sam', role: 'viewer' }]);
      renderDrawer('resp-1');

      expect(await screen.findByText('Internal notes')).toBeInTheDocument();
      expect(screen.getByText('Assignee')).toBeInTheDocument();
      expect(screen.getByText('Activity')).toBeInTheDocument();
      expect(screen.queryByText('Working with others?')).not.toBeInTheDocument();
    });

    it('shows them if the share lookup fails, rather than hiding something by mistake', async () => {
      mockGetResponseById.mockResolvedValue(detail);
      mockListGrants.mockRejectedValue(new Error('403'));
      renderDrawer('resp-1');

      expect(await screen.findByText('Internal notes')).toBeInTheDocument();
    });

    it('always shows them in a workspace', async () => {
      mockGetResponseById.mockResolvedValue(detail);
      renderDrawer('resp-1', vi.fn(), { scope: 'acme' });

      expect(await screen.findByText('Internal notes')).toBeInTheDocument();
      expect(mockListGrants).not.toHaveBeenCalled();
    });
  });
});

// QA A6-010: below 640px the six action buttons (about 290px) left the respondent's name almost no room. jsdom has no
// layout, so this pins the structure that gives the name its own row instead of measuring pixels.
describe('ResponseDrawer header on small screens', () => {
  it('lets the header wrap, with the name taking a full row and the actions pushed to the end of the next', async () => {
    mockGetResponseById.mockResolvedValue(detail);
    renderDrawer('resp-1');
    await screen.findByText('Submitted response');
    const header = screen.getByRole('heading', { level: 2 }).closest('header') as HTMLElement;
    expect(header.className).toMatch(/\bflex-wrap\b/);
    const nameRow = screen.getByRole('heading', { level: 2 }).closest('div.min-w-0.items-center, div.flex.min-w-0') as HTMLElement;
    expect(nameRow.className).toMatch(/max-sm:basis-full/);
    const actions = screen.getByRole('button', { name: 'Download response' }).parentElement as HTMLElement;
    expect(actions.className).toMatch(/max-sm:ml-auto/);
  });
});
