import type { BulkTarget, ResponseFilters } from '@/types/response';
import type { CreateReportPayload, ReportFormat } from '@/types/report';

/**
 * Toolbar/bulk Export builds the report request from the current InboxFilters (or the selected
 * ids), so the export equals the list. Pure so the equivalence is directly testable
 * (`__tests__/lib/reportExport.test.ts`) without mounting either view.
 */
export function exportPayloadFromFilters(
  format: ReportFormat,
  formId: string | undefined,
  filters: ResponseFilters
): CreateReportPayload {
  return { format, formId, filters };
}

/** Same shape, built from a `BulkTarget` (an explicit selection or "Select all N matching") —
 * used by the bulk bar / Inbox toolbar's Export action. */
export function exportPayloadFromTarget(format: ReportFormat, target: BulkTarget): CreateReportPayload {
  return 'ids' in target
    ? { format, ids: target.ids }
    : { format, formId: target.formId, filters: target.filter };
}
