import type { SearchResult } from '@/types/search';

// Sprint 14 (B10, requirements 2.2): where each result opens. `id` and `formId` come from server data,
// never from a URL param, and are encoded anyway. `scope` is 'personal' or a workspace slug.
export function resolveSearchTarget(result: SearchResult, scope: string): string {
  const ws = scope !== 'personal' ? `?ws=${encodeURIComponent(scope)}` : '';
  switch (result.type) {
    case 'forms':
      return `/forms/${encodeURIComponent(result.id)}/overview${ws}`;
    case 'responses': {
      const id = encodeURIComponent(result.id);
      if (result.formId) return `/forms/${encodeURIComponent(result.formId)}/inbox?responseId=${id}${scope !== 'personal' ? `&ws=${encodeURIComponent(scope)}` : ''}`;
      return scope !== 'personal' ? `/w/${scope}/inbox?responseId=${id}` : `/inbox?responseId=${id}`;
    }
    case 'members':
      return scope !== 'personal' ? `/w/${scope}/team` : '/dashboard';
    case 'templates':
      return scope !== 'personal' ? `/w/${scope}/templates` : '/templates';
  }
}

/** Splits `text` around case-insensitive occurrences of `query`, for highlighting. Never builds HTML -
 * the caller renders each part as a React text node (design.md §19). */
export function splitByMatch(text: string, query: string): { text: string; match: boolean }[] {
  const q = query.trim();
  if (!q) return [{ text, match: false }];
  const parts: { text: string; match: boolean }[] = [];
  const lower = text.toLowerCase();
  const needle = q.toLowerCase();
  let from = 0;
  for (let at = lower.indexOf(needle); at !== -1; at = lower.indexOf(needle, from)) {
    if (at > from) parts.push({ text: text.slice(from, at), match: false });
    parts.push({ text: text.slice(at, at + needle.length), match: true });
    from = at + needle.length;
  }
  if (from < text.length) parts.push({ text: text.slice(from), match: false });
  return parts.length > 0 ? parts : [{ text, match: false }];
}
