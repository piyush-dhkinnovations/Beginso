import type { BulkTarget, ResponseFilters } from '@/types/response';
import type { CreateReportPayload, ReportFormat } from '@/types/report';
import { PERSONAL_DEFAULT_STAGES } from '@/types/stage';

// The backend reads these at the top level of the request and silently drops keys it does not know, and it calls the
// search text `search`. A chart drill-through (`chart`) and `includeTest` are sent too, so the file holds the list's rows.
function reportFields(filters: ResponseFilters): Omit<CreateReportPayload, 'format' | 'formId' | 'ids'> {
  const { stageId, tagIds, assigneeId, unread, duplicate, from, to, q, field, value, granularity, chart, includeTest } = filters;
  // Personal stages are the fixed categories, not stored stages: the backend filters them as `status`.
  const personal = PERSONAL_DEFAULT_STAGES.find((s) => s.id === stageId);
  return {
    ...(personal ? { status: personal.category } : { stageId }),
    tagIds, assigneeId, unread, duplicate, from, to, search: q, field, value, granularity, chart, includeTest,
  };
}

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
  return { format, formId, ...reportFields(filters) };
}

/** Same shape, built from a `BulkTarget` (an explicit selection or "Select all N matching") —
 * used by the bulk bar / Inbox toolbar's Export action. */
export function exportPayloadFromTarget(format: ReportFormat, target: BulkTarget): CreateReportPayload {
  return 'ids' in target
    ? { format, ids: target.ids }
    : { format, formId: target.formId, ...reportFields(target.filter) };
}
