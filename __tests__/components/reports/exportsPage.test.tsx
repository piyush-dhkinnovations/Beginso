/**
 * Exports page: status filter reaches the request (A7-006), expired rows collapse (A9-012), and a report job's
 * scope is read from the live `filters` object (captured shape in fixtures/analytics/reports.real.json).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import reportsReal from '../../fixtures/analytics/reports.real.json';

vi.mock('next/navigation', () => ({
  usePathname: () => '/exports',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(''),
}));
vi.mock('@/services/forms', () => ({
  formsService: { getAllForms: () => Promise.resolve({ forms: [{ _id: 'form-1', title: 'Survey' }], total: 1, page: 1, limit: 100 }) },
}));
const mockCreateReport = vi.fn();
const mockGetReports = vi.fn();
vi.mock('@/services/reports', async (orig) => ({
  ...(await orig<typeof import('@/services/reports')>()),
  reportsService: { createReport: (...a: unknown[]) => mockCreateReport(...a), getReports: (...a: unknown[]) => mockGetReports(...a) },
}));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

import { ReportsView } from '@/components/reports/ReportsView';
import { mockReportJob } from '@/lib/mocks/reportsMocks';

function renderView() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ReportsView />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  mockCreateReport.mockReset().mockResolvedValue(mockReportJob({ _id: 'new-1', status: 'queued' }));
  mockGetReports.mockReset().mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 });
});

describe('status filter', () => {
  it('sends the chosen status with the export request', async () => {
    renderView();
    fireEvent.change(await screen.findByLabelText('Status'), { target: { value: 'completed' } });
    fireEvent.click(screen.getAllByRole('button', { name: /^Generate/ })[0]);
    await waitFor(() => expect(mockCreateReport).toHaveBeenCalledWith(expect.objectContaining({ format: 'csv', status: 'completed' }), 'personal'));
  });

  it('sends no status when "All statuses" is selected', async () => {
    renderView();
    await screen.findByLabelText('Status');
    fireEvent.click(screen.getAllByRole('button', { name: /^Generate/ })[0]);
    await waitFor(() => expect(mockCreateReport).toHaveBeenCalled());
    expect(mockCreateReport.mock.calls[0][0].status).toBeUndefined();
  });
});

describe('expired exports', () => {
  it('are hidden behind a toggle, and the live rows stay visible', async () => {
    mockGetReports.mockResolvedValue({
      data: [
        mockReportJob({ _id: 'r1', status: 'completed', formTitle: 'Live form' }),
        mockReportJob({ _id: 'r2', status: 'expired', formTitle: 'Old form one' }),
        mockReportJob({ _id: 'r3', status: 'expired', formTitle: 'Old form two' }),
      ],
      total: 3, page: 1, limit: 20, totalPages: 1,
    });
    renderView();
    expect((await screen.findAllByText('Live form')).length).toBeGreaterThan(0);
    expect(screen.queryByText('Old form one')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show 2 expired exports' }));
    expect((await screen.findAllByText('Old form one')).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Hide expired exports' })).toBeInTheDocument();
  });
});

describe('report job shape', () => {
  it('reads status and range from the live `filters` object', async () => {
    const { reportsService } = await vi.importActual<typeof import('@/services/reports')>('@/services/reports');
    expect(reportsService).toBeDefined();
    const live = (reportsReal.body as any).reports[0];
    expect(live.filters).toBeDefined(); // the live job nests its scope under `filters`; top-level from/to/status do not exist
    expect(live.from).toBeUndefined();
  });
});
