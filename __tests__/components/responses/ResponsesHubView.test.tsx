import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ResponsesHubView } from '@/components/responses/ResponsesHubView';

const mockReplace = vi.fn();
const mockPush = vi.fn();
let search = '';

vi.mock('next/navigation', () => ({
  usePathname: () => '/forms/form-1/responses',
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
  useSearchParams: () => new URLSearchParams(search),
}));

const mockGetFormById = vi.fn();
vi.mock('@/services/forms', () => ({
  formsService: { getFormById: (...args: unknown[]) => mockGetFormById(...args) },
}));

const mockGetResponses = vi.fn();
const mockGetStats = vi.fn();
vi.mock('@/services/responses', () => ({
  responsesService: {
    getResponses: (...args: unknown[]) => mockGetResponses(...args),
    getStats: (...args: unknown[]) => mockGetStats(...args),
    update: vi.fn(),
    deleteResponse: vi.fn(),
  },
}));

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1', name: 'Test User', email: 't@example.com' } }),
}));

const form = { _id: 'form-1', title: 'Customer survey' };
const emptyPage = { data: [], total: 0, page: 1, limit: 50, totalPages: 1 };

function renderHub() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ResponsesHubView formId="form-1" />
    </QueryClientProvider>
  );
}

describe('ResponsesHubView query and pagination states', () => {
  beforeEach(() => {
    search = '';
    mockReplace.mockReset();
    mockPush.mockReset();
    mockGetFormById.mockReset().mockResolvedValue(form);
    mockGetResponses.mockReset().mockResolvedValue(emptyPage);
    mockGetStats.mockReset().mockResolvedValue({ total: 0, unread: 0, byStage: [], byCategory: { new: 0, in_progress: 0, completed: 0 } });
  });

  it('attributes a response-list failure to the list, not to a missing form', async () => {
    mockGetResponses.mockRejectedValue(new Error('backend unavailable'));
    renderHub();

    expect(await screen.findByText('Unable to load responses')).toBeInTheDocument();
    expect(screen.queryByText('Form not found')).not.toBeInTheDocument();
  });

  it('uses the actual form-query 404 for the form-not-found state', async () => {
    mockGetFormById.mockRejectedValue({ isAxiosError: true, response: { status: 404 } });
    renderHub();

    expect(await screen.findByText('Form not found')).toBeInTheDocument();
  });

  it('normalizes invalid page URLs before requesting responses', async () => {
    search = 'page=NaN';
    renderHub();

    await waitFor(() => expect(mockGetResponses).toHaveBeenCalled());
    expect(mockGetResponses.mock.calls[0][0]).toMatchObject({ page: 1 });
    expect(mockReplace).toHaveBeenCalledWith('/forms/form-1/responses?page=1');
  });

  it('ignores an invalid legacy status URL — never sent to the service, valid page kept', async () => {
    // sprint-12-inbox-collaboration: legacy `?status=` is now resolved against real workspace
    // stages (lib/inboxFilters.ts), not validated against the removed fixed union. An
    // unrecognised value simply maps to no stage filter, rather than being stripped and
    // resetting the page — see inboxFilters.test.ts for the mapping's own coverage.
    search = 'status=administrator&page=4';
    mockGetResponses.mockResolvedValue({ ...emptyPage, page: 4, totalPages: 5 });
    renderHub();

    await waitFor(() => expect(mockGetResponses).toHaveBeenCalled());
    const [params] = mockGetResponses.mock.calls[0];
    expect(params).not.toHaveProperty('status');
    expect(params.stageId).toBeUndefined();
    expect(params.page).toBe(4);
  });

  it('clamps a beyond-last-page URL to the final available page', async () => {
    search = 'page=99';
    mockGetResponses.mockResolvedValue({ ...emptyPage, page: 99, totalPages: 3 });
    renderHub();

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/forms/form-1/responses?page=3');
    });
  });
});
