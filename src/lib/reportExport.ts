import type { BulkTarget, ResponseFilters } from '@/types/response';
import type { CreateReportPayload, ReportFormat } from '@/types/report';

/**
 * Sprint 12 (inbox-collaboration), requirements.md §7.9/B2.3, design.md §8 "Export": "toolbar/bulk
 * Export builds the report request from the current InboxFilters (or the selected ids) ... so the
 * export equals the list." Pure so the equivalence is directly testable
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
 * used by the bulk bar / Inbox toolbar's Export action (task 2.4/2.7). */
export function exportPayloadFromTarget(format: ReportFormat, target: BulkTarget): CreateReportPayload {
  return 'ids' in target
    ? { format, ids: target.ids }
    : { format, formId: target.formId, filters: target.filter };
}
