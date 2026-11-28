/**
 * How often an open response asks the server for what teammates did, that it stops asking while the tab is hidden,
 * and that one's own note, stage change or delete is fetched at once instead of at the next poll.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, renderHook, screen, fireEvent, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';

vi.mock('@/services/notes', () => ({
  notesService: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
  MentionAccessError: class extends Error {},
}));
vi.mock('@/services/activity', () => ({ activityService: { list: vi.fn() } }));
vi.mock('@/services/responses', () => ({
  responsesService: { getResponses: vi.fn(), getStats: vi.fn(), update: vi.fn(), bulk: vi.fn(), deleteResponse: vi.fn(), markRead: vi.fn() },
}));
vi.mock('@/services/forms', () => ({ formsService: { getFormById: vi.fn() } }));
vi.mock('@/hooks/useMembers', () => ({ useMembers: () => ({ data: [] }) }));
vi.mock('@/hooks/useScoreCriteria', () => ({ useScoreCriteria: () => ({ data: [], isLoading: false }) }));
vi.mock('@/hooks/useFormFields', () => ({ useFormFields: () => [] }));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

import { notesService } from '@/services/notes';
import { activityService } from '@/services/activity';
import { responsesService } from '@/services/responses';
import { NotesPanel } from '@/components/responses/NotesPanel';
import { WorkflowSidebar } from '@/components/responses/WorkflowSidebar';
import { useResponsesData } from '@/components/responses/useResponsesData';
import { useInboxMutations } from '@/hooks/useInboxMutations';
import type { ResponseDetail } from '@/types/response';

const listNotes = vi.mocked(notesService.list);
const listActivity = vi.mocked(activityService.list);
const listResponses = vi.mocked(responsesService.getResponses);

const note = { id: 'n1', body: 'First note', authorId: 'u1', authorName: 'A', mentions: [], createdAt: '2026-11-01T10:00:00.000Z', updatedAt: '2026-11-01T10:00:00.000Z' };
const response = { _id: 'r1', formId: 'f1', answers: {}, tags: [], submittedAt: '2026-11-01T10:00:00.000Z' } as unknown as ResponseDetail;

const notesPanel = <NotesPanel responseId="r1" scope="acme" workspaceName="Acme" currentUserId="u1" canDeleteAny={false} />;
const activityCard = (
  <WorkflowSidebar
    response={response}
    scope="acme"
    stages={[]}
    tags={[]}
    members={[]}
    only="activity"
    canCreateTag={false}
    onStageChange={() => {}}
    onAssigneeChange={() => {}}
    onTagAdd={() => {}}
    onTagRemove={() => {}}
    onTagCreate={() => {}}
  />
);

let client: QueryClient;
const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
const wait = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  listNotes.mockResolvedValue([note] as never);
  listActivity.mockResolvedValue([]);
  listResponses.mockResolvedValue({ data: [], total: 0, page: 1, limit: 50, totalPages: 1 } as never);
  vi.mocked(responsesService.getStats).mockResolvedValue({} as never);
  vi.mocked(responsesService.update).mockResolvedValue(response as never);
  vi.mocked(responsesService.bulk).mockResolvedValue({ succeeded: ['r1'], failed: [], previous: [] } as never);
  vi.mocked(responsesService.deleteResponse).mockResolvedValue(undefined as never);
  vi.mocked(notesService.create).mockResolvedValue(note as never);
  vi.mocked(notesService.remove).mockResolvedValue(undefined);
});

afterEach(() => {
  focusManager.setFocused(undefined);
  vi.useRealTimers();
});

/** Asks once on opening, again after exactly `every`, and not at all while the tab is hidden. */
async function expectPolling(calls: () => number, every: number) {
  await wait(0);
  expect(calls()).toBe(1);
  await wait(every - 100);
  expect(calls()).toBe(1);
  await wait(200);
  expect(calls()).toBe(2);
  act(() => focusManager.setFocused(false));
  await wait(10 * 60_000);
  expect(calls()).toBe(2);
}

describe('how often an open response asks the server', () => {
  it('notes: every 20 seconds, never while the tab is hidden', async () => {
    render(notesPanel, { wrapper });
    await expectPolling(() => listNotes.mock.calls.length, 20_000);
  });

  it('activity: every 30 seconds, never while the tab is hidden', async () => {
    render(activityCard, { wrapper });
    await expectPolling(() => listActivity.mock.calls.length, 30_000);
  });

  it('the list: every 30 seconds, never while the tab is hidden', async () => {
    renderHook(() => useResponsesData({ scope: 'acme', filters: {} as never, page: 1, pageLimit: 50, setPage: vi.fn() }), { wrapper });
    await expectPolling(() => listResponses.mock.calls.length, 30_000);
  });
});

describe("one's own change shows at once, without waiting for a poll", () => {
  async function openResponse() {
    render(<>{notesPanel}{activityCard}</>, { wrapper });
    await wait(0);
    expect(listNotes).toHaveBeenCalledTimes(1);
    expect(listActivity).toHaveBeenCalledTimes(1);
  }

  it('posting a note refetches the notes and the activity', async () => {
    await openResponse();
    const box = screen.getByPlaceholderText(/Leave a note/);
    fireEvent.change(box, { target: { value: 'Hello' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    await wait(10);
    expect(listNotes).toHaveBeenCalledTimes(2);
    expect(listActivity).toHaveBeenCalledTimes(2);
  });

  it('deleting a note refetches the notes and the activity', async () => {
    await openResponse();
    fireEvent.doubleClick(screen.getByLabelText('Double-click for edit and delete options'));
    fireEvent.click(screen.getByText('Delete'));
    await wait(10);
    expect(listNotes).toHaveBeenCalledTimes(2);
    expect(listActivity).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['a stage change', (m: ReturnType<typeof useInboxMutations>) => void m.updateStage('r1', 's2')],
    ['an assignment', (m: ReturnType<typeof useInboxMutations>) => m.updateAssignee('r1', 'u2')],
    ['a bulk change', (m: ReturnType<typeof useInboxMutations>) => m.bulk({ ids: ['r1'] }, { type: 'stage', stageId: 's2' })],
  ])('%s refetches the activity and the list', async (_name, change) => {
    render(activityCard, { wrapper });
    const { result } = renderHook(
      () => {
        useResponsesData({ scope: 'acme', filters: {} as never, page: 1, pageLimit: 50, setPage: vi.fn() });
        return useInboxMutations({ scope: 'acme' });
      },
      { wrapper }
    );
    await wait(0);
    act(() => change(result.current));
    await wait(10);
    expect(listActivity).toHaveBeenCalledTimes(2);
    expect(listResponses).toHaveBeenCalledTimes(2);
  });

  it('deleting a response refetches the list', async () => {
    const { result } = renderHook(
      () => {
        useResponsesData({ scope: 'acme', filters: {} as never, page: 1, pageLimit: 50, setPage: vi.fn() });
        return useInboxMutations({ scope: 'acme' });
      },
      { wrapper }
    );
    await wait(0);
    act(() => result.current.singleDelete('r1'));
    await wait(10);
    expect(listResponses).toHaveBeenCalledTimes(2);
  });
});
