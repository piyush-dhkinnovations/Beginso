/**
 * __tests__/reports/reportPolling.property.test.ts
 * Feature: sprint-5-analytics-reports, Property 4: Polling gate is exact
 * Validates: Requirement 11.2, 11.3
 */

import { describe, it } from 'vitest';
import fc from 'fast-check';
import { shouldPollReportJob } from '@/lib/reportPolling';
import type { ReportStatus } from '@/types/report';

describe('shouldPollReportJob — property test', () => {
  it('returns true iff status is queued or processing, false for every terminal status', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<ReportStatus>('queued', 'processing', 'completed', 'failed', 'expired'),
        (status) => shouldPollReportJob(status) === (status === 'queued' || status === 'processing')
      ),
      { numRuns: 100 }
    );
  });
});
