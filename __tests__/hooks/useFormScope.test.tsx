import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const hint = vi.hoisted(() => ({ value: null as string | null }));
const getFormById = vi.hoisted(() => vi.fn());
const list = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useSearchParams: () => ({ get: () => hint.value }) }));
vi.mock('@/services/forms', () => ({ formsService: { getFormById } }));
vi.mock('@/services/workspaces', () => ({ workspacesService: { list } }));

import { useFormScope } from '@/hooks/useFormScope';

const draw = () =>
  renderHook(() => useFormScope('f1'), {
    wrapper: ({ children }) => <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>,
  });

beforeEach(() => {
  hint.value = null;
  getFormById.mockReset();
  list.mockReset().mockResolvedValue([{ id: 'w-mine', slug: 'mine' }]);
});

describe('useFormScope', () => {
  it('a personal form is read in the personal context', async () => {
    getFormById.mockResolvedValue({ _id: 'f1', workspaceId: null });
    const { result } = draw();
    await waitFor(() => expect(result.current).toBe('personal'));
  });

  it("a workspace's form is read under that workspace's slug when I am a member", async () => {
    getFormById.mockResolvedValue({ _id: 'f1', workspaceId: 'w-mine' });
    const { result } = draw();
    await waitFor(() => expect(result.current).toBe('mine'));
  });

  it('a form shared with me by a workspace I am not in is read in the personal context, not left loading for ever', async () => {
    getFormById.mockResolvedValue({ _id: 'f1', workspaceId: 'w-someone-else' });
    const { result } = draw();
    expect(result.current).toBeUndefined(); // while it is still finding out
    await waitFor(() => expect(result.current).toBe('personal'));
  });

  it('an address that names the workspace wins', () => {
    hint.value = 'acme';
    const { result } = draw();
    expect(result.current).toBe('acme');
  });
});
