import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const push = vi.fn();
const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace }) }));
vi.mock('@/services/forms', () => ({ formsService: { getFormById: vi.fn() } }));
vi.mock('@/services/workspaces', () => ({ workspacesService: { list: vi.fn() } }));
const toast = vi.fn();
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast }) }));

import { formsService } from '@/services/forms';
import { workspacesService } from '@/services/workspaces';
import { useBuilderStore } from '@/store/builderStore';
import { useBuilderForm } from '@/components/form-builder/useBuilderForm';
import type { Form } from '@/types/form';

const getFormById = formsService.getFormById as ReturnType<typeof vi.fn>;
const listWorkspaces = workspacesService.list as ReturnType<typeof vi.fn>;

const form = (over: Record<string, unknown> = {}) =>
  ({ _id: 'f1', workspaceId: null, title: 'Survey', status: 'draft', fields: [], pages: [], branding: {}, settings: {}, ...over }) as unknown as Form;

function setup(id = 'f1') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  return { queryClient, ...renderHook(() => useBuilderForm(id), { wrapper }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  useBuilderStore.setState({ formId: null, formTitle: '', fields: [], dirty: false });
  listWorkspaces.mockResolvedValue([{ id: 'w1', slug: 'acme', name: 'Acme', role: 'editor' }]);
});

describe('useBuilderForm', () => {
  it('loads a personal form, seeds the store and derives personal links', async () => {
    getFormById.mockResolvedValue(form());
    const { result } = setup();
    await waitFor(() => expect(result.current.form).toBeDefined());
    await waitFor(() => expect(useBuilderStore.getState().formId).toBe('f1'));
    expect(useBuilderStore.getState().formTitle).toBe('Survey');
    expect(result.current.formsListHref).toBe('/forms');
    expect(result.current.overviewHref).toBe('/forms/f1/overview');
    expect(result.current.formRole).toBe('owner');
    expect(result.current.formWorkspaceSlug).toBeUndefined();
    expect(listWorkspaces).not.toHaveBeenCalled();
  });

  it('resolves the workspace slug, list/overview links and role for a workspace form', async () => {
    getFormById.mockResolvedValue(form({ workspaceId: 'w1' }));
    const { result } = setup();
    await waitFor(() => expect(result.current.formWorkspaceSlug).toBe('acme'));
    expect(result.current.formsListHref).toBe('/w/acme/forms');
    expect(result.current.overviewHref).toBe('/forms/f1/overview?ws=acme');
    expect(result.current.formRole).toBe('editor');
    expect(result.current.formWorkspace?.name).toBe('Acme');
  });

  it('prefers the form myRole over the membership role', async () => {
    getFormById.mockResolvedValue(form({ workspaceId: 'w1', myRole: 'admin' }));
    const { result } = setup();
    await waitFor(() => expect(result.current.formRole).toBe('admin'));
  });

  it('redirects a role that cannot edit to the read-only overview', async () => {
    getFormById.mockResolvedValue(form({ workspaceId: 'w1', myRole: 'viewer' }));
    setup();
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/forms/f1/overview'));
  });

  it('does not redirect an editor', async () => {
    getFormById.mockResolvedValue(form({ workspaceId: 'w1', myRole: 'editor' }));
    const { result } = setup();
    await waitFor(() => expect(result.current.form).toBeDefined());
    expect(replace).not.toHaveBeenCalled();
  });

  it('seeds the store once per form id, so a cache patch cannot wipe later edits', async () => {
    getFormById.mockResolvedValue(form());
    const { result, queryClient } = setup();
    await waitFor(() => expect(useBuilderStore.getState().formId).toBe('f1'));
    useBuilderStore.getState().setFormTitle('Edited locally');

    queryClient.setQueryData(['form', 'f1'], form({ status: 'published' }));
    await waitFor(() => expect(result.current.form?.status).toBe('published'));
    expect(useBuilderStore.getState().formTitle).toBe('Edited locally');
  });

  it('toasts and returns to the forms list when the form cannot be loaded (once)', async () => {
    getFormById.mockRejectedValue(new Error('404'));
    const { result } = setup();
    await waitFor(() => expect(push).toHaveBeenCalledWith('/forms'));
    expect(toast).toHaveBeenCalledWith('Form not found or access denied', 'error');
    expect(result.current.isLoading).toBe(false);
    expect(push).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledTimes(1);
  });
});
