'use client';

import Link from 'next/link';
import { FileText, Inbox, LayoutTemplate, Users, type LucideIcon } from 'lucide-react';
import { resolveSearchTarget, splitByMatch } from '@/lib/searchTarget';
import type { SearchGroupKey, SearchResult } from '@/types/search';

export const SEARCH_GROUP_ICON: Record<SearchGroupKey, LucideIcon> = {
  forms: FileText,
  responses: Inbox,
  members: Users,
  templates: LayoutTemplate,
};

// The match is highlighted by splitting the string and rendering text nodes - never by injecting HTML.
export function Highlight({ text, query }: { text: string; query: string }) {
  return (
    <>
      {splitByMatch(text, query).map((part, i) =>
        part.match ? (
          <strong key={i} className="font-bold text-(--text-primary)">{part.text}</strong>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  );
}

function trailing(result: SearchResult): string | undefined {
  switch (result.type) {
    case 'forms':
      return result.archived ? 'Archived' : result.status;
    case 'responses':
      return result.reference;
    case 'members':
      return result.role;
    case 'templates':
      return result.source === 'workspace' ? 'Workspace' : result.category;
  }
}

/** The row's inner markup - shared by the palette (inside its option) and the full page (inside a link). */
export function SearchResultContent({ result, query }: { result: SearchResult; query: string }) {
  const Icon = SEARCH_GROUP_ICON[result.type];
  const tail = trailing(result);
  return (
    <>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-(--accent-soft) text-(--accent-soft-text)">
        <Icon size={16} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate bg-body-sm text-(--text-secondary)">
          <Highlight text={result.title} query={query} />
        </span>
        {result.subtitle && <span className="block truncate bg-caption text-(--text-muted)">{result.subtitle}</span>}
      </span>
      {tail && <span className="shrink-0 bg-caption capitalize text-(--text-muted)">{tail}</span>}
    </>
  );
}

// Full-page row: a real link, so middle-click and "open in new tab" work.
export function SearchResultRow({ result, query, scope }: { result: SearchResult; query: string; scope: string }) {
  return (
    <li>
      <Link
        href={resolveSearchTarget(result, scope)}
        className="flex min-h-10 items-center gap-3 px-4 py-2.5 transition-colors hover:bg-(--surface-hover) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--border-focus)"
      >
        <SearchResultContent result={result} query={query} />
      </Link>
    </li>
  );
}
