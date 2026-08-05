/**
 * __tests__/components/responses/LegacyResponseRedirect.test.tsx
 * Feature: responses-drawer-redesign
 * Tests: the legacy /responses/[id] route now redirects to the ResponseDrawer's URL shape
 * instead of rendering a standalone page.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LegacyResponseDetailRedirect from '@/app/(user)/responses/[id]/page';

const mockReplace = vi.fn();
const mockPush = vi.fn();
let mockSearchParamsValue = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'resp-1' }),
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
  useSearchParams: () => mockSearchParamsValue,
}));

const mockGetResponseById = vi.fn();
vi.mock('@/services/responses', () => ({
  responsesService: { getResponseById: (...args: unknown[]) => mockGetResponseById(...args) },
}));

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <LegacyResponseDetailRedirect />
    </QueryClientProvider>
  );
}

describe('Legacy /responses/[id] redirect', () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockPush.mockReset();
    mockGetResponseById.mockReset();
    mockSearchParamsValue = new URLSearchParams();
  });

  it('redirects immediately using formId from the query string, without fetching', async () => {
    mockSearchParamsValue = new URLSearchParams('formId=form-1');
    renderPage();

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/forms/form-1/responses?responseId=resp-1');
    });
    expect(mockGetResponseById).not.toHaveBeenCalled();
  });

  it('fetches the response to learn formId when the query string has none', async () => {
    mockGetResponseById.mockResolvedValue({ _id: 'resp-1', formId: 'form-2' });
    renderPage();

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/forms/form-2/responses?responseId=resp-1');
    });
  });

  it('redirects to /forms on fetch error', async () => {
    mockGetResponseById.mockRejectedValue(new Error('not found'));
    renderPage();

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/forms');
    });
  });
});
