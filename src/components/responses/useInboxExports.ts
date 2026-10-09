'use client';

import { getFriendlyErrorMessage } from '@/lib/errorHelpers';
import { reportsService } from '@/services/reports';
import { exportPayloadFromFilters, exportPayloadFromTarget } from '@/lib/reportExport';
import { useToast } from '@/components/ui/Toast';
import type { BulkTarget } from '@/types/response';
import type { useInboxFilters } from '@/hooks/useInboxFilters';

type Filters = ReturnType<typeof useInboxFilters>['filters'];

export function useInboxExports({ formId, filters }: { formId?: string; filters: Filters }) {
  const { toast } = useToast();

  function startExport(request: Promise<unknown>) {
    request
      .then(() => toast('Export started. Find it under Exports when it finishes.', 'success'))
      .catch((e) => toast(getFriendlyErrorMessage(e, { action: 'export responses', fallback: 'Failed to start the export. Please try again.' }), 'error'));
  }

  return {
    runExport: (target: BulkTarget) => startExport(reportsService.createReport(exportPayloadFromTarget('csv', target))),
    exportCurrentFilter: () => startExport(reportsService.createReport(exportPayloadFromFilters('csv', formId, filters))),
  };
}
