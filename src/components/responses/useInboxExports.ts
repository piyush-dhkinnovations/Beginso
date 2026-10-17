'use client';

import { getFriendlyErrorMessage } from '@/lib/errorHelpers';
import { reportsService } from '@/services/reports';
import { exportPayloadFromFilters, exportPayloadFromTarget } from '@/lib/reportExport';
import { useToast } from '@/components/ui/Toast';
import type { BulkTarget } from '@/types/response';
import type { useInboxFilters } from '@/hooks/useInboxFilters';

type Filters = ReturnType<typeof useInboxFilters>['filters'];

// `scope` is the workspace slug (or 'personal') the responses belong to. It used to be left out, so every export went out under the
// personal scope and a workspace form answered "Form not found" (QA D5-002).
export function useInboxExports({ formId, filters, scope = 'personal' }: { formId?: string; filters: Filters; scope?: string }) {
  const { toast } = useToast();

  function startExport(request: Promise<unknown>) {
    request
      .then(() => toast('Export started. Find it under Exports when it finishes.', 'success'))
      .catch((e) => toast(getFriendlyErrorMessage(e, { action: 'export responses', fallback: 'Failed to start the export. Please try again.' }), 'error'));
  }

  return {
    runExport: (target: BulkTarget) => startExport(reportsService.createReport(exportPayloadFromTarget('csv', target), scope)),
    exportCurrentFilter: () => startExport(reportsService.createReport(exportPayloadFromFilters('csv', formId, filters), scope)),
  };
}
