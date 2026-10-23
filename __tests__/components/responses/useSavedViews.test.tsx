import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/services/views', () => ({ viewsService: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() } }));
const toast = vi.fn();
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast }) }));

import { viewsService } from '@/services/views';
import { useSavedViews } from '@/components/responses/useSavedViews';
import type { SavedView } from '@/types/savedView';

const svc = viewsService as unknown as Record<'list' | 'create' | 'update' | 'remove', ReturnType<typeof vi.fn>>;

const saved = (id: string, extra: Partial<SavedView> = {}): SavedView =>
  ({ id, name: `View ${id}`, ownerId: 'u', ownerName: 'U', visibility: 'team', formId: 'f1', filters: { unread: true }, viewMode: 'board', createdAt: '', ...extra }) as SavedView;

type Opts = Parameters<typeof useSavedViews>[0];
function setup(o: Partial<Opts> = {}) {
  const setFilters = vi.fn();
  const clearSelection = vi.fn();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  const opts: Opts = { scope: 'acme', formId: 'f1', filters: { stageId: 's1' }, view: 'table', setFilters, role: 'admin', clearSelection, ...o };
  return { setFilters, clearSelection, invalidate, ...renderHook(() => useSavedViews(opts), { wrapper }) };
}
const lastToast = () => toast.mock.calls.at(-1)!;

beforeEach(() => {
  vi.clearAllMocks();
  svc.list.mockResolvedValue([saved('v1')]);
});

describe('useSavedViews - loading and permissions', () => {
  it('lists views for a workspace scope', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.views).toHaveLength(1));
    expect(svc.list).toHaveBeenCalledWith('acme', 'f1');
  });

  it('does not fetch views in the personal shell', () => {
    const { result } = setup({ scope: 'personal' });
    expect(svc.list).not.toHaveBeenCalled();
    expect(result.current.views).toBeUndefined();
  });

  it.each([
    ['owner', true], ['admin', true], ['editor', true], ['member', true], ['viewer', false], ['reviewer', false], [undefined, false],
  ])('canCreateTeamView for role %s is %s', (role, expected) => {
    expect(setup({ role: role as Opts['role'] }).result.current.canCreateTeamView).toBe(expected);
  });
});

describe('applyView', () => {
  it('activates the view, clears selection and applies its filters and mode from page 1', () => {
    const { result, setFilters, clearSelection } = setup();
    act(() => result.current.applyView(saved('v9')));
    expect(result.current.activeViewId).toBe('v9');
    expect(clearSelection).toHaveBeenCalled();
    expect(setFilters).toHaveBeenCalledWith({ unread: true, view: 'board' }, { resetPage: true });
    act(() => result.current.clearAppliedView());
    expect(result.current.activeViewId).toBeUndefined();
  });
});

describe('switching between views', () => {
  // The URL-backed setter only changes the keys it is given, so the second view must name every key it does not use as cleared.
  it('clears every filter the new view does not set, so the previous view leaves nothing behind', () => {
    const { result, setFilters } = setup();
    act(() => result.current.applyView(saved('a', { filters: { stageId: 's1', assigneeId: 'me' } })));
    act(() => result.current.applyView(saved('b', { filters: { unread: true } })));
    const patch = setFilters.mock.calls.at(-1)![0];
    expect(patch).toMatchObject({ unread: true, view: 'board' });
    for (const key of ['stageId', 'assigneeId', 'tagIds', 'duplicate', 'includeTest', 'from', 'to', 'q', 'field', 'value', 'granularity']) {
      expect(patch, key).toHaveProperty(key, undefined);
    }
    expect(result.current.activeViewId).toBe('b');
  });

  it('"All responses" drops the applied view and its filters', () => {
    const { result, setFilters, clearSelection } = setup();
    act(() => result.current.applyView(saved('a')));
    act(() => result.current.showAllResponses());
    expect(result.current.activeViewId).toBeUndefined();
    expect(clearSelection).toHaveBeenCalledTimes(2);
    const patch = setFilters.mock.calls.at(-1)![0];
    expect(patch).toHaveProperty('stageId', undefined);
    expect(patch).toHaveProperty('unread', undefined);
    expect(setFilters.mock.calls.at(-1)![1]).toEqual({ resetPage: true });
  });
});

describe('saveView', () => {
  it('saves with the active view mode and filters, then activates it', async () => {
    svc.create.mockResolvedValue(saved('new'));
    const { result, invalidate } = setup({ view: 'calendar' });
    act(() => result.current.setSaveViewOpen(true));
    act(() => result.current.saveView({ name: 'Mine', visibility: 'personal' }));
    await waitFor(() => expect(lastToast()).toEqual(['View saved.', 'success']));
    expect(svc.create).toHaveBeenCalledWith('acme', { name: 'Mine', visibility: 'personal', formId: 'f1', filters: { stageId: 's1' }, viewMode: 'calendar' });
    expect(result.current.activeViewId).toBe('new');
    expect(result.current.saveViewOpen).toBe(false);
    expect(invalidate).toHaveBeenCalled();
  });

  it('saves a workspace-wide view with formId null and keeps the modal open on failure', async () => {
    svc.create.mockRejectedValue(new Error('x'));
    const { result } = setup({ formId: undefined });
    act(() => result.current.setSaveViewOpen(true));
    act(() => result.current.saveView({ name: 'N', visibility: 'team' }));
    await waitFor(() => expect(lastToast()).toEqual(['Failed to save the view. Please try again.', 'error']));
    expect(svc.create.mock.calls[0][1].formId).toBeNull();
    expect(result.current.saveViewOpen).toBe(true);
    expect(result.current.activeViewId).toBeUndefined();
  });
});

describe('renameView', () => {
  it('renames and toasts', async () => {
    svc.update.mockResolvedValue(undefined);
    const { result } = setup();
    act(() => result.current.renameView(saved('v1'), 'New name'));
    await waitFor(() => expect(lastToast()).toEqual(['View renamed.', 'success']));
    expect(svc.update).toHaveBeenCalledWith('acme', 'v1', { name: 'New name' });
  });

  it('toasts a failure', async () => {
    svc.update.mockRejectedValue(new Error('x'));
    const { result } = setup();
    act(() => result.current.renameView(saved('v1'), 'N'));
    await waitFor(() => expect(lastToast()).toEqual(['Failed to rename the view. Please try again.', 'error']));
  });
});

describe('deleteView', () => {
  it('deletes, clears the active view if it was that one, and Undo recreates it', async () => {
    svc.remove.mockResolvedValue(undefined);
    svc.create.mockResolvedValue(saved('again'));
    const { result } = setup();
    const target = saved('v1');
    act(() => result.current.applyView(target));
    expect(result.current.activeViewId).toBe('v1');

    act(() => result.current.deleteView(target));
    await waitFor(() => expect(lastToast()[0]).toBe('View deleted.'));
    expect(svc.remove).toHaveBeenCalledWith('acme', 'v1');
    expect(result.current.activeViewId).toBeUndefined();

    const action = lastToast()[3] as { label: string; onClick: () => void };
    expect(action.label).toBe('Undo');
    act(() => {
      action.onClick();
    });
    await waitFor(() => expect(lastToast()).toEqual(['View restored.', 'success']));
    expect(svc.create).toHaveBeenCalledWith('acme', { name: 'View v1', visibility: 'team', formId: 'f1', filters: { unread: true }, viewMode: 'board' });
  });

  it('keeps another active view when a different one is deleted', async () => {
    svc.remove.mockResolvedValue(undefined);
    const { result } = setup();
    act(() => result.current.applyView(saved('keep')));
    act(() => result.current.deleteView(saved('other')));
    await waitFor(() => expect(lastToast()[0]).toBe('View deleted.'));
    expect(result.current.activeViewId).toBe('keep');
  });

  it('toasts failures for delete and for restore', async () => {
    svc.remove.mockRejectedValueOnce(new Error('x'));
    const { result } = setup();
    act(() => result.current.deleteView(saved('v1')));
    await waitFor(() => expect(lastToast()).toEqual(['Failed to delete the view. Please try again.', 'error']));

    svc.remove.mockResolvedValueOnce(undefined);
    svc.create.mockRejectedValueOnce(new Error('y'));
    act(() => result.current.deleteView(saved('v2')));
    await waitFor(() => expect(lastToast()[0]).toBe('View deleted.'));
    act(() => {
      (lastToast()[3] as { onClick: () => void }).onClick();
    });
    await waitFor(() => expect(lastToast()).toEqual(['Failed to restore the view.', 'error']));
  });
});
