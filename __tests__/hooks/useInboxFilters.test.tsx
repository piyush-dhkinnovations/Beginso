import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const replace = vi.hoisted(() => vi.fn());
const params = vi.hoisted(() => ({ value: new URLSearchParams() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => '/forms/f1/inbox',
  useSearchParams: () => params.value,
}));
vi.mock('@/hooks/useResponseSetup', () => ({
  useFormStages: () => ({ stages: [], isLoading: false }),
  useResponseSetup: () => ({ data: undefined }),
}));

import { useInboxFilters } from '@/hooks/useInboxFilters';

beforeEach(() => replace.mockReset());

describe('useInboxFilters', () => {
  it('"Show all with this email": one address change that closes the open response and fills the search, so neither undoes the other', () => {
    params.value = new URLSearchParams('responseId=r1&page=3&view=board');
    const { result } = renderHook(() => useInboxFilters({ scope: 'personal', formId: 'f1' }));
    act(() => result.current.setFilters({ search: 'piyush@gmail.com' }, { resetPage: true, drop: ['responseId'] }));
    expect(replace).toHaveBeenCalledTimes(1);
    const url = new URL(replace.mock.calls[0][0], 'http://x');
    expect(url.searchParams.get('responseId')).toBeNull();
    expect(url.searchParams.get('search')).toBe('piyush@gmail.com');
    expect(url.searchParams.get('page')).toBe('1'); // back to the first page
    expect(url.searchParams.get('view')).toBe('board');
  });
});
