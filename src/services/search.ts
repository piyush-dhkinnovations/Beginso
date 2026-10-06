import axiosInstance from '@/lib/axios';
import { unwrapEnvelope } from '@/lib/apiEnvelope';
import { workspaceHeaders } from '@/lib/workspaceHeaders';
import { SEARCH_GROUP_ORDER, type SearchGroup, type SearchGroupKey, type SearchResponse, type SearchResult } from '@/types/search';

// Sprint 14 (B10, design.md §11.2). Does NO client-side filtering - the server is the authority on
// what the caller may see (F14). Everything is read defensively: a missing group renders as empty.
function toGroup(key: SearchGroupKey, raw: unknown): SearchGroup {
  const g = (raw ?? {}) as { total?: unknown; items?: unknown };
  const items = Array.isArray(g.items)
    ? (g.items as Record<string, unknown>[])
        .filter((i) => i && (i.id ?? i._id))
        .map((i) => ({ ...i, id: String(i.id ?? i._id), type: key, title: String(i.title ?? i.name ?? '') }) as unknown as SearchResult)
    : [];
  return { total: typeof g.total === 'number' ? g.total : items.length, items };
}

export const searchService = {
  search: (q: string, scope: string, signal?: AbortSignal): Promise<SearchResponse> =>
    axiosInstance
      .get('/api/search', { params: { q, limit: 10 }, headers: workspaceHeaders(scope), signal })
      .then((r) => {
        const body = unwrapEnvelope<Record<string, unknown>>(r.data, 'data') ?? {};
        const groups = (body.groups ?? {}) as Record<string, unknown>;
        const scopeInfo = (body.scope ?? {}) as { kind?: 'workspace' | 'personal'; label?: string };
        return {
          q: typeof body.q === 'string' ? body.q : q,
          scope: { kind: scopeInfo.kind ?? (scope === 'personal' ? 'personal' : 'workspace'), label: scopeInfo.label ?? '' },
          answerSearch: body.answerSearch === true,
          groups: Object.fromEntries(SEARCH_GROUP_ORDER.map((k) => [k, toGroup(k, groups[k])])) as SearchResponse['groups'],
        };
      }),
};
