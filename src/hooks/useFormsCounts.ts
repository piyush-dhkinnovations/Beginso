import { useQuery } from '@tanstack/react-query';
import { formatRelativeTime } from '@/lib/formatters';
import { formsService } from '@/services/forms';
import { workspaceKeys } from '@/lib/queryKeys';
import type { Form } from '@/types/form';
import type { FormsContext } from '@/types/workspace';
import type { FormsManagerTab } from '@/components/forms/FormsManagerTabs';

// Chip/header counts. When the unfiltered list is fully on screen (every form fits one page) they are counted
// from it directly — no extra requests. Otherwise one `limit=1` request per bucket reads only `total`.
// Closed is derived (all − published − draft), which is exact because the default list excludes archived forms.
// The API sorts by created date, so "last edited" is only honest when every form is loaded.
export function useFormsCounts(
  context: FormsContext,
  data: { forms: Form[]; total: number } | undefined,
  activeTab: FormsManagerTab,
  debouncedSearch: string
) {
  const loadedAll = activeTab === 'recent' && !debouncedSearch && !!data && data.total <= data.forms.length;
  const useCountOf = (params: { status?: string; archived?: 'only' }) =>
    useQuery({
      queryKey: workspaceKeys.forms(context, { ...params, page: 1, limit: 1 }),
      queryFn: () => formsService.getForms({ ...params, page: 1, limit: 1 }, context),
      select: (r) => r.total,
      enabled: !!data && !loadedAll,
      staleTime: 30_000,
    });
  const { data: queriedAll } = useCountOf({});
  const { data: queriedPublished } = useCountOf({ status: 'published' });
  const { data: queriedDraft } = useCountOf({ status: 'draft' });
  const { data: archivedCount } = useCountOf({ archived: 'only' });
  const allCount = loadedAll ? data.total : queriedAll;
  const publishedCount = loadedAll ? data.forms.filter((f) => f.status === 'published').length : queriedPublished;
  const draftCount = loadedAll ? data.forms.filter((f) => f.status === 'draft').length : queriedDraft;
  const closedCount =
    allCount !== undefined && publishedCount !== undefined && draftCount !== undefined ? Math.max(0, allCount - publishedCount - draftCount) : undefined;
  const tabCounts = { recent: allCount, published: publishedCount, draft: draftCount, closed: closedCount, archived: archivedCount };
  const lastEdited = loadedAll && data.total > 0 ? data.forms.reduce((m, f) => (f.updatedAt > m ? f.updatedAt : m), '') : '';
  const headerFacts =
    allCount === undefined
      ? undefined
      : allCount === 0
        ? '0 forms'
        : [
            `${allCount} form${allCount === 1 ? '' : 's'}`,
            publishedCount !== undefined && `${publishedCount} live`,
            draftCount !== undefined && `${draftCount} draft${draftCount === 1 ? '' : 's'}`,
            lastEdited && `last edited ${formatRelativeTime(lastEdited)}`,
          ]
            .filter(Boolean)
            .join(' · ');

  return { allCount, tabCounts, headerFacts };
}
