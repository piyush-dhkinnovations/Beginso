'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { CommandPalette, type CommandPaletteGroup } from '@/components/ui/CommandPalette';
import { Button } from '@/components/ui/Button';
import { SearchResultContent } from './SearchResultRow';
import { OPEN_SEARCH_EVENT } from './SearchTrigger';
import { SEARCH_MAX_CHARS, SEARCH_MIN_CHARS, useGlobalSearch } from '@/hooks/useGlobalSearch';
import { useDebounce } from '@/hooks/useDebounce';
import { RESPONSES_SCOPE_NOTE, useSearchScopeNote } from '@/hooks/useSearchScopeNote';
import { useWorkspaceRole } from '@/hooks/useWorkspaceRole';
import { searchKeys } from '@/lib/queryKeys';
import { resolveSearchTarget } from '@/lib/searchTarget';
import { SEARCH_GROUP_LABEL, SEARCH_GROUP_ORDER } from '@/types/search';

const PALETTE_ROWS_PER_GROUP = 5;

interface GlobalSearchProps {
  /** 'personal' or the active workspace slug. Mount with `key={scope}` so a context switch resets the query. */
  scope: string;
}

// Sprint 14 (B10, requirements 2.1-2.5, tasks 3.7-3.9). Opens on Ctrl/Cmd+K from anywhere in the app
// and on SearchTrigger's click, shows grouped results (5 per group) and a "See all results" row that
// opens the full page. All filtering is the server's job (F14) - this component only renders.
export function GlobalSearch({ scope }: GlobalSearchProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isOpen, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const role = useWorkspaceRole(scope);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
  }, []);

  // Ctrl/Cmd+K toggles the palette. Only a contenteditable (rich-text) target is exempt, so the
  // shortcut still works with focus in an ordinary input (requirements 2.1).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== 'k' || !(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return;
      if (e.target instanceof HTMLElement && e.target.closest('[contenteditable="true"]')) return;
      e.preventDefault();
      setOpen(true);
    }
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener(OPEN_SEARCH_EVENT, onOpen);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener(OPEN_SEARCH_EVENT, onOpen);
    };
  }, []);

  // A role / grant change must never leave results computed under the old permissions on screen (design.md §10).
  useEffect(() => {
    queryClient.removeQueries({ queryKey: searchKeys.all });
  }, [role, queryClient]);

  const search = useGlobalSearch(scope, query);
  const data = search.data;
  const scopeNote = useSearchScopeNote(scope, data?.scope.label);
  const trimmed = query.trim();
  const longEnough = trimmed.length >= SEARCH_MIN_CHARS;

  const go = useCallback(
    (href: string) => {
      close();
      router.push(href);
    },
    [close, router],
  );

  const seeAllHref = `${scope === 'personal' ? '/search' : `/w/${scope}/search`}?q=${encodeURIComponent(trimmed)}`;

  const groups = useMemo<CommandPaletteGroup[]>(() => {
    if (!data || !longEnough) return [];
    const built: CommandPaletteGroup[] = SEARCH_GROUP_ORDER.map((key) => ({
      id: key,
      label: `${SEARCH_GROUP_LABEL[key]} (${data.groups[key].total})`,
      note: key === 'responses' && !data.answerSearch && data.groups[key].items.length > 0 ? RESPONSES_SCOPE_NOTE : undefined,
      items: data.groups[key].items.slice(0, PALETTE_ROWS_PER_GROUP).map((result) => ({
        id: `${key}-${result.id}`,
        content: <SearchResultContent result={result} query={data.q} />,
        onSelect: () => go(resolveSearchTarget(result, scope)),
      })),
    }));
    const hasAny = built.some((g) => g.items.length > 0);
    if (hasAny) {
      built.push({
        id: 'all',
        label: 'All results',
        items: [
          {
            id: 'see-all',
            content: (
              <span className="flex items-center gap-2 bg-body-sm font-semibold text-(--action-primary)">
                See all results <ArrowRight size={14} aria-hidden="true" />
              </span>
            ),
            onSelect: () => go(seeAllHref),
          },
        ],
      });
    }
    return built;
  }, [data, longEnough, go, scope, seeAllHref]);

  const total = data ? SEARCH_GROUP_ORDER.reduce((sum, key) => sum + data.groups[key].total, 0) : 0;
  // Debounced so the live region does not chatter while the user is still typing.
  const statusText = useDebounce(
    !longEnough || search.pending || !data ? '' : total === 0 ? 'No results' : `${total} ${total === 1 ? 'result' : 'results'}`,
    400,
  );

  let emptyState: React.ReactNode;
  if (!longEnough) {
    emptyState = <p className="px-3 py-6 text-center bg-body-sm text-(--text-muted)">Search forms, responses, members, templates</p>;
  } else if (search.isError) {
    emptyState = (
      <div role="alert" className="flex flex-col items-center gap-2 px-3 py-6 text-center">
        <p className="bg-body-sm text-(--text-muted)">We could not search right now.</p>
        <Button variant="secondary" size="small" onClick={() => void search.refetch()}>Try again</Button>
      </div>
    );
  } else if (search.pending || search.isLoading || !data) {
    emptyState = (
      <div className="flex flex-col gap-2 p-3" aria-busy="true" aria-label="Searching">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-(--bg-sunken)" />
        ))}
      </div>
    );
  } else {
    emptyState = (
      <div className="px-3 py-6 text-center">
        <p className="bg-body-sm font-semibold text-(--text-primary)">No results for &ldquo;{trimmed}&rdquo;</p>
        <p className="mt-1 bg-caption text-(--text-muted)">Try a shorter or different term.</p>
      </div>
    );
  }

  return (
    <CommandPalette
      isOpen={isOpen}
      onClose={close}
      query={query}
      onQueryChange={setQuery}
      groups={groups}
      label="Search"
      placeholder="Search forms, responses, members, templates…"
      maxLength={SEARCH_MAX_CHARS}
      header={scopeNote}
      emptyState={emptyState}
      statusText={statusText}
      footer={data && !data.answerSearch ? 'Responses: reference and respondent only' : undefined}
    />
  );
}
