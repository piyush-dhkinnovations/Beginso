import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { name: 'Pat' } }) }));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/services/forms', () => ({
  formsService: { getForms: vi.fn(), duplicateForm: vi.fn(), deleteForm: vi.fn(), archiveForm: vi.fn(), unarchiveForm: vi.fn(), pinForm: vi.fn(), unpinForm: vi.fn() },
}));
vi.mock('@/services/trash', () => ({ trashService: { restore: vi.fn() } }));
vi.mock('@/services/workspaces', () => ({ workspacesService: { list: vi.fn() } }));

import { formsService } from '@/services/forms';
import { workspacesService } from '@/services/workspaces';
import { useFormsPage } from '@/hooks/useFormsPage';
import type { Form } from '@/types/form';

const getForms = formsService.getForms as ReturnType<typeof vi.fn>;
const listWorkspaces = workspacesService.list as ReturnType<typeof vi.fn>;

const row = (id: string, title: string, responseCount: number) =>
  ({ _id: id, title, status: 'published', responseCount, updatedAt: '2026-01-01T00:00:00Z', workspaceId: null }) as unknown as Form;

const personal = { type: 'personal' } as const;

function setup(context: Parameters<typeof useFormsPage>[0] = personal) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  return renderHook(() => useFormsPage(context), { wrapper });
}

/** Params of the list requests (limit != 1); the counts hook fires limit=1 probes too. */
const listCalls = () => getForms.mock.calls.filter(([p]) => p.limit !== 1).map(([p]) => p);
const lastListParams = () => listCalls().at(-1);

beforeEach(() => {
  vi.clearAllMocks();
  getForms.mockImplementation(async (p: { limit: number }) =>
    p.limit === 1
      ? { forms: [], total: 0, page: 1, limit: 1 }
      : { forms: [row('a', 'Alpha', 1), row('b', 'Bravo', 9), row('c', 'Charlie', 4)], total: 3, page: 1, limit: p.limit },
  );
  listWorkspaces.mockResolvedValue([]);
});
afterEach(() => vi.useRealTimers());

describe('useFormsPage sort wiring', () => {
  it('asks the server for updatedAt desc by default', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.rows).toHaveLength(3));
    expect(lastListParams()).toMatchObject({ sort: 'updatedAt', order: 'desc', page: 1, limit: 10 });
    expect(result.current.sort).toEqual({ key: 'updated', dir: 'desc' });
  });

  it('title and status sort ascending first, then flip', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.rows).toHaveLength(3));

    act(() => result.current.toggleSort('title'));
    await waitFor(() => expect(lastListParams()).toMatchObject({ sort: 'title', order: 'asc' }));
    act(() => result.current.toggleSort('title'));
    await waitFor(() => expect(lastListParams()).toMatchObject({ sort: 'title', order: 'desc' }));

    act(() => result.current.toggleSort('status'));
    await waitFor(() => expect(lastListParams()).toMatchObject({ sort: 'status', order: 'asc' }));
  });

  it('updated sorts descending first', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.rows).toHaveLength(3));
    act(() => result.current.toggleSort('title'));
    act(() => result.current.toggleSort('updated'));
    await waitFor(() => expect(lastListParams()).toMatchObject({ sort: 'updatedAt', order: 'desc' }));
  });

  it('responses is not sent to the server and sorts the loaded page client-side', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.rows).toHaveLength(3));

    act(() => result.current.toggleSort('responses'));
    await waitFor(() => expect(result.current.sort.key).toBe('responses'));
    await waitFor(() => expect(result.current.rows.map((f) => f._id)).toEqual(['b', 'c', 'a']));
    const params = lastListParams();
    expect(params.sort).toBeUndefined();
    expect(params.order).toBeUndefined();

    act(() => result.current.toggleSort('responses'));
    await waitFor(() => expect(result.current.rows.map((f) => f._id)).toEqual(['a', 'c', 'b']));
  });

  it('keeps server order for server-sorted keys (no client re-sort)', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.rows).toHaveLength(3));
    expect(result.current.rows.map((f) => f._id)).toEqual(['a', 'b', 'c']);
  });
});

describe('useFormsPage tabs', () => {
  it('archived tab requests archived=only; pinned tab requests pinned=true', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.rows).toHaveLength(3));

    act(() => result.current.handleTabChange('archived'));
    await waitFor(() => expect(lastListParams()).toMatchObject({ archived: 'only' }));
    expect(result.current.onArchivedTab).toBe(true);

    act(() => result.current.handleTabChange('pinned'));
    await waitFor(() => expect(lastListParams()).toMatchObject({ pinned: true }));
    expect(lastListParams().archived).toBeUndefined();
    expect(result.current.onPinnedTab).toBe(true);
  });

  it('a status tab filters by status, resets the page and clears selection', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.rows).toHaveLength(3));
    act(() => {
      result.current.setPage(3);
      result.current.toggleSelected('a');
    });
    expect(result.current.selecting).toBe(true);

    act(() => result.current.handleTabChange('draft'));
    await waitFor(() => expect(lastListParams()).toMatchObject({ status: 'draft', page: 1 }));
    expect(result.current.selectedIds.size).toBe(0);
    expect(result.current.page).toBe(1);
  });

  it('recent tab sends no status param', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.rows).toHaveLength(3));
    expect(lastListParams().status).toBeUndefined();
  });

  it('changing page size changes the requested limit', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.rows).toHaveLength(3));
    act(() => result.current.setPageSize(25));
    await waitFor(() => expect(lastListParams()).toMatchObject({ limit: 25 }));
  });
});

describe('useFormsPage selection and navigation', () => {
  it('toggles selection and derives the select-all flags', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.rows).toHaveLength(3));
    act(() => result.current.toggleSelected('a'));
    expect(result.current.someOnPageSelected).toBe(true);
    expect(result.current.allOnPageSelected).toBe(false);
    act(() => {
      result.current.toggleSelected('b');
      result.current.toggleSelected('c');
    });
    expect(result.current.allOnPageSelected).toBe(true);
    expect(result.current.someOnPageSelected).toBe(false);
    act(() => result.current.toggleSelected('a'));
    expect(result.current.selectedIds.has('a')).toBe(false);
  });

  it('computes the max response count', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.rows).toHaveLength(3));
    expect(result.current.maxResponses).toBe(9);
  });

  it('startCreate pushes the create flow for the current space', async () => {
    const { result } = setup({ type: 'workspace', workspaceId: 'acme' });
    act(() => result.current.startCreate());
    expect(push).toHaveBeenCalledWith('/forms/new?ws=acme');
  });

  it('a single click opens the overview after a short delay; selecting mode toggles instead', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.rows).toHaveLength(3));
    vi.useFakeTimers();
    act(() => result.current.openOrSelect(result.current.rows[0]));
    expect(push).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(push).toHaveBeenCalledWith('/forms/a/overview');
    vi.useRealTimers();

    act(() => result.current.toggleSelected('b'));
    push.mockClear();
    act(() => result.current.openOrSelect(result.current.rows[0]));
    expect(push).not.toHaveBeenCalled();
    expect(result.current.selectedIds.has('a')).toBe(true);
  });

  it('ownerName is the caller in personal space', async () => {
    const { result } = setup();
    expect(result.current.ownerName(row('a', 'A', 0))).toBe('Pat');
  });
});

describe('useFormsPage permissions', () => {
  it('personal space can always delete, archive and create', () => {
    const { result } = setup();
    expect(result.current).toMatchObject({ canDelete: true, canArchive: true, canCreate: true, canMakeTemplate: false });
  });

  it('workspace permissions follow the caller role', async () => {
    listWorkspaces.mockResolvedValue([{ id: 'w1', slug: 'acme', name: 'Acme', role: 'viewer' }]);
    const { result } = setup({ type: 'workspace', workspaceId: 'acme' });
    await waitFor(() => expect(listWorkspaces).toHaveBeenCalled());
    await waitFor(() => expect(result.current.canDelete).toBe(false));
    expect(result.current.canArchive).toBe(false);
    expect(result.current.canCreate).toBe(false);
  });

  it('a workspace owner can delete and archive', async () => {
    listWorkspaces.mockResolvedValue([{ id: 'w1', slug: 'acme', name: 'Acme', role: 'owner' }]);
    const { result } = setup({ type: 'workspace', workspaceId: 'acme' });
    await waitFor(() => expect(result.current.canDelete).toBe(true));
    expect(result.current.canArchive).toBe(true);
  });
});
