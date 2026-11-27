import { responsesService } from '@/services/responses';
import type { GetResponsesParams, IResponse } from '@/types/response';

/**
 * The calendar needs
 * "every item in a bounded window", not one paginated page — the list endpoint caps at 50/page
 * so it pages through the list internally rather than showing only the first
 * 50 submissions of a month.
 */
const PAGE_LIMIT = 50;
// ponytail: caps at 10 pages (500 responses) per window rather than paginating indefinitely. A
// workspace/date-window with more than that undercounts here — real day-level pagination is the
// upgrade path if that ever bites; not built now since one month is not expected to routinely
// exceed it.
const MAX_PAGES = 10;

export async function fetchAllResponses(params: GetResponsesParams, scope: string): Promise<IResponse[]> {
  let page = 1;
  const all: IResponse[] = [];
  while (page <= MAX_PAGES) {
    const result = await responsesService.getResponses({ ...params, page, limit: PAGE_LIMIT }, scope);
    all.push(...result.data);
    if (page >= result.totalPages) break;
    page += 1;
  }
  return all;
}
