import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupValues, useFormStages, useResponseSetup } from '@/hooks/useResponseSetup';
import { DEFAULT_RESPONSE_SETUP, type ResponseSetup } from '@/types/responseSetup';

const mockGet = vi.fn();
vi.mock('@/services/responseSetup', () => ({ responseSetupService: { get: (...a: unknown[]) => mockGet(...a) } }));
vi.mock('@/services/stages', () => ({
  stagesService: {
    list: vi.fn().mockResolvedValue([
      { id: 'w1', name: 'New', colour: 'neutral', category: 'new', order: 0, isDefault: true },
      { id: 'w2', name: 'Done', colour: 'success', category: 'completed', order: 1, isDefault: false },
    ]),
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
);

const workspaceSetup: ResponseSetup = { version: 0, setup: DEFAULT_RESPONSE_SETUP, stages: { mode: 'workspace', list: [], startIndex: null } };
const ownSetup: ResponseSetup = {
  version: 1,
  setup: { ...DEFAULT_RESPONSE_SETUP, opensAs: 'board' },
  stages: {
    mode: 'own',
    startIndex: 0,
    list: [
      { id: 'a', name: 'Received', colour: 'neutral', category: 'new', order: 0, isDefault: true },
      { id: 'b', name: 'Odd colour', colour: 'teal-ish', category: 'in_progress', order: 1, isDefault: false },
    ],
  },
};

describe('useResponseSetup', () => {
  beforeEach(() => mockGet.mockReset());

  it('does not ask for anything without a form', () => {
    renderHook(() => useResponseSetup(undefined), { wrapper });
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('setupValues is the form\'s setup, or today\'s defaults while it loads', () => {
    expect(setupValues(undefined)).toEqual(DEFAULT_RESPONSE_SETUP);
    expect(setupValues(ownSetup).opensAs).toBe('board');
  });
});

describe('useFormStages', () => {
  beforeEach(() => mockGet.mockReset());

  it('a form on the workspace stages gets the workspace\'s', async () => {
    mockGet.mockResolvedValue(workspaceSetup);
    const { result } = renderHook(() => useFormStages('acme', 'f1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.stages?.map((s) => s.name)).toEqual(['New', 'Done']);
  });

  it('a form with its own stages gets those, and a colour the app does not know becomes grey', async () => {
    mockGet.mockResolvedValue(ownSetup);
    const { result } = renderHook(() => useFormStages('acme', 'f1'), { wrapper });
    await waitFor(() => expect(result.current.stages?.map((s) => s.name)).toEqual(['Received', 'Odd colour']));
    expect(result.current.stages?.[1].colour).toBe('neutral');
    expect(result.current.stages?.[1].category).toBe('in_progress');
  });

  it('with no form (the all-forms views) it is the workspace\'s stages and asks for no setup', async () => {
    const { result } = renderHook(() => useFormStages('acme', undefined), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.stages?.map((s) => s.name)).toEqual(['New', 'Done']);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('is loading until both the workspace stages and the form\'s setup are in', async () => {
    mockGet.mockResolvedValue(ownSetup);
    const { result } = renderHook(() => useFormStages('acme', 'f1'), { wrapper });
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });
});
