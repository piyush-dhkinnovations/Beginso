import { bucketLabel } from '@/lib/chartOptions';
import { formatRelativeTime } from '@/lib/formatters';
import type { useInboxFilters } from '@/hooks/useInboxFilters';
import type { useResponsesData } from './useResponsesData';

type InboxFilters = ReturnType<typeof useInboxFilters>;
type ResponsesData = ReturnType<typeof useResponsesData>;

interface Input {
  filters: InboxFilters['filters'];
  search: InboxFilters['search'];
  stages: InboxFilters['stages'];
  page: number;
  form: ResponsesData['form'];
  stats: ResponsesData['stats'];
  firstResponseSubmittedAt: string | undefined;
}

/** Pure derivations of the inbox header/empty/filter copy from filters + loaded data. */
export function deriveInboxViewModel({ filters, search, stages, page, form, stats, firstResponseSubmittedAt }: Input) {
  const hasActiveFilters =
    !!search || !!filters.stageId || !!filters.assigneeId || !!filters.unread || !!filters.field || !!filters.chart || !!filters.tagIds?.length || !!filters.from || !!filters.to || !!filters.duplicate;
  // Chart drill-down chip: "Satisfaction: Very satisfied" (date buckets read as plain words).
  const drillField = filters.field ? form?.fields.find((f) => f.fieldId === filters.field) : undefined;
  const fieldChipLabel = filters.field
    ? `${drillField?.label ?? 'Chart filter'}: ${filters.value === undefined ? 'answered' : drillField?.type === 'date' ? bucketLabel(filters.value) : filters.value}`
    : undefined;

  // Page facts: real counts from the stats endpoint; "last submitted" only when the unfiltered newest-first
  // page is on screen (the list is submittedAt-desc, so its first row is the newest response).
  const lastSubmitted = page === 1 && !hasActiveFilters ? firstResponseSubmittedAt : undefined;
  const headerFacts = stats
    ? [
        `${stats.total} response${stats.total === 1 ? '' : 's'}`,
        `${stats.unread} unread`,
        `${stats.byCategory.new} new`,
        lastSubmitted && `last submitted ${formatRelativeTime(lastSubmitted)}`,
      ]
        .filter(Boolean)
        .join(' · ')
    : undefined;
  // Names what is filtering the list, for the no-results state.
  const filterSummary = [
    filters.stageId && `stage ${stages.find((s) => s.id === filters.stageId)?.name ?? 'unknown'}`,
    filters.unread && 'unread',
    filters.assigneeId && 'that assignee',
    filters.tagIds?.length && 'that tag',
    (filters.from || filters.to) && 'that date range',
    search && `"${search}"`,
    filters.field && (fieldChipLabel ?? 'that chart filter'),
    filters.chart && 'that chart',
  ]
    .filter(Boolean)
    .join(' + ');

  return { hasActiveFilters, fieldChipLabel, headerFacts, filterSummary };
}
