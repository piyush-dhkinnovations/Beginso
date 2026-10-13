/**
 * __tests__/reports/ReportJobRow.property.test.tsx
 * Feature: sprint-5-analytics-reports, Property 5: Report download never caches the URL
 * Validates: Requirement 12.2
 */

import { describe, it, vi, beforeEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fc from 'fast-check';
import { mockReportJob } from '@/lib/mocks/reportsMocks';

const mockGetReportFileBlobUrl = vi.fn();
vi.mock('@/services/reports', () => ({
  reportsService: { getReportFileBlobUrl: (...args: unknown[]) => mockGetReportFileBlobUrl(...args) },
}));

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import { ReportJobRow } from '@/components/reports/ReportJobRow';

describe('ReportJobRow — property test', () => {
  beforeEach(() => {
    vi.spyOn(window, 'open').mockImplementation(() => null);
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  it('calls getReportFileBlobUrl exactly once per Download click — never a cached value', async () => {
    // Component-mount PBT: fewer iterations than the pure-logic properties above, since each
    // run mounts/clicks/unmounts a real component tree.
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 5 }), async (clicks) => {
        mockGetReportFileBlobUrl.mockReset();
        mockGetReportFileBlobUrl.mockResolvedValue('blob:mock-url');

        const user = userEvent.setup();
        const job = mockReportJob({ _id: 'report-completed', status: 'completed', format: 'csv' });
        render(<table><tbody><ReportJobRow job={job} onRetry={vi.fn()} /></tbody></table>);

        const button = screen.getByRole('button', { name: 'Download' });
        for (let i = 0; i < clicks; i++) {
          await user.click(button);
        }

        const ok = mockGetReportFileBlobUrl.mock.calls.length === clicks;
        cleanup();
        return ok;
      }),
      { numRuns: 25 }
    );
  });
});
