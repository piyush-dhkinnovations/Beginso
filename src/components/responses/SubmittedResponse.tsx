'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { LayoutGrid, List, Search, Table2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { SegmentedRadio } from '@/components/ui/SegmentedRadio';
import { useNarrow } from '@/hooks/useNarrow';
import { useResponseView } from '@/hooks/useResponseView';
import { arrangeAnswers, effectiveLayout } from '@/lib/responseView';
import type { AnswerItem } from '@/lib/responseAnswers';
import { cn } from '@/lib/utils';
import type { ResponseLayout } from '@/types/responseView';
import { LAYOUTS } from './layouts';
import { ResponseViewOptions } from './ResponseViewOptions';

interface SubmittedResponseProps {
  responseId: string;
  items: AnswerItem[];
  formId: string | undefined;
  scope: string;
  /** The form definition is still loading: show a skeleton shaped like the chosen layout. */
  loading?: boolean;
  /** False while the form definition is unavailable: then no answer can be called "from a removed question". */
  hasSchema: boolean;
  /** Editors only - shows "Set as form default" (the server enforces it as well). */
  canSetFormDefault?: boolean;
}

const LAYOUT_OPTIONS: { id: ResponseLayout; label: string; title: string; icon: ReactNode }[] = [
  { id: 'grid', label: 'Grid', title: 'Two columns', icon: <LayoutGrid size={14} aria-hidden="true" /> },
  { id: 'list', label: 'List', title: 'One column', icon: <List size={14} aria-hidden="true" /> },
  { id: 'table', label: 'Table', title: 'Rows like a table', icon: <Table2 size={14} aria-hidden="true" /> },
];

const LAYOUT_NAME: Record<ResponseLayout, string> = { grid: 'Grid', list: 'List', table: 'Table' };

function LayoutSkeleton({ layout }: { layout: ResponseLayout }) {
  const rows = layout === 'grid' ? 6 : 4;
  return (
    <div
      aria-busy="true"
      className={cn('pt-3', layout === 'grid' ? 'grid grid-cols-1 gap-x-8 gap-y-4 @lg:grid-cols-2' : 'flex flex-col gap-4')}
    >
      {Array.from({ length: rows }).map((_, i) =>
        layout === 'table' ? (
          <div key={i} className="grid grid-cols-[35%_1fr] gap-4">
            <div className="h-4 animate-pulse rounded bg-(--bg-subtle)" />
            <div className="h-4 animate-pulse rounded bg-(--bg-subtle)" />
          </div>
        ) : (
          <div key={i} className="flex flex-col gap-2">
            <div className="h-3.5 w-1/3 animate-pulse rounded bg-(--bg-subtle)" />
            <div className="h-4 w-full animate-pulse rounded bg-(--bg-subtle)" />
          </div>
        )
      )}
    </div>
  );
}

const isEditable = (el: EventTarget | null): boolean =>
  el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));

/**
 * The "Submitted response" card: the answers in the layout the person chose (Grid, List or Table), with a switcher, display
 * options and a search. Switching is instant - nothing here waits on the network.
 */
export function SubmittedResponse({ responseId, items, formId, scope, loading = false, hasSchema, canSetFormDefault = false }: SubmittedResponseProps) {
  const narrow = useNarrow();
  const rv = useResponseView({ formId, scope });
  const { view } = rv;
  const layout = effectiveLayout(view.layout, narrow);
  const Layout = LAYOUTS[layout];

  const [query, setQuery] = useState('');
  const [revealEmpty, setRevealEmpty] = useState(false);
  const [announce, setAnnounce] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  // "/" jumps to the search, like most apps. Never while typing somewhere, never with a modifier key.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || isEditable(e.target)) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const arranged = useMemo(
    () => arrangeAnswers(items, { showEmpty: view.showEmpty || revealEmpty, query, hasSchema }),
    [items, view.showEmpty, revealEmpty, query, hasSchema]
  );
  const shared = { responseId, scope, showNumbers: view.showNumbers, density: view.density, query };

  return (
    <section aria-label="Submitted response" className="@container min-w-0 self-start rounded-lg border border-(--border-default) bg-(--surface-card)" data-layout={layout}>
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-t-lg border-b border-(--border-subtle) bg-(--surface-card) px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <h3 className="bg-body font-semibold text-(--text-primary)">Submitted response</h3>
          <p className="mt-0.5 bg-body-sm text-(--text-muted)">
            {loading || arranged.total === 0 ? 'All answers provided by the respondent.' : `${arranged.answered} of ${arranged.total} answered`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="w-48 max-md:w-full">
            <Input
              ref={searchRef}
              id={`response-search-${responseId}`}
              type="search"
              aria-label="Search in response"
              placeholder="Search in response"
              leftIcon={<Search size={14} />}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape' && query) {
                  // Clears the search; a second Escape (empty box) is left to close the drawer.
                  e.stopPropagation();
                  setQuery('');
                }
              }}
              className="h-8"
            />
          </div>

          {narrow ? (
            <p className="bg-body-sm text-(--text-muted)">Shown as a list on small screens</p>
          ) : (
            <SegmentedRadio
              ariaLabel="Layout"
              iconOnlyBelow="lg"
              value={view.layout}
              onChange={(id) => {
                rv.setView({ layout: id as ResponseLayout });
                setAnnounce(`Layout: ${LAYOUT_NAME[id as ResponseLayout]}`);
              }}
              options={LAYOUT_OPTIONS.map(({ id, label, title, icon }) => ({ id, label, title, icon }))}
            />
          )}
          <span role="status" aria-live="polite" className="sr-only">{announce}</span>

          <ResponseViewOptions
            view={view}
            onChange={rv.setView}
            useForAll={rv.useForAll}
            onUseForAll={rv.setUseForAll}
            onUseFormDefault={rv.hasPersonalChoice ? () => void rv.useFormDefault() : undefined}
            onSetFormDefault={canSetFormDefault ? () => void rv.setAsFormDefault() : undefined}
          />
        </div>
      </div>

      <div className="px-4 pb-4 pt-1 sm:px-5">
        {loading ? (
          <LayoutSkeleton layout={layout} />
        ) : items.length === 0 ? (
          <p className="py-6 text-center bg-body-sm text-(--text-muted)">No submitted answers.</p>
        ) : (
          <>
            {arranged.matches === 0 ? (
              <p className="py-6 text-center bg-body-sm text-(--text-muted)" role="status">
                {query.trim() ? `No answers match “${query.trim()}”.` : 'Every answer is empty.'}
              </p>
            ) : (
              <Layout items={[...arranged.top, ...arranged.main]} {...shared} />
            )}

            {arranged.removed.length > 0 && (
              <div className="mt-6">
                <h4 className="mb-1 bg-body font-semibold text-(--text-primary)">Other answers (question removed)</h4>
                <Layout items={arranged.removed} {...shared} />
              </div>
            )}

            {arranged.hiddenEmpty > 0 && !revealEmpty && (
              <p className="mt-3 bg-body-sm text-(--text-muted)">
                {arranged.hiddenEmpty} empty hidden.{' '}
                <button type="button" onClick={() => setRevealEmpty(true)} className="font-medium text-(--text-link) hover:underline">
                  Show
                </button>
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
