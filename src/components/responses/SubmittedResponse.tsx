'use client';

import type { SubmittedResponseState } from '@/hooks/useSubmittedResponse';
import { cn } from '@/lib/utils';
import type { ResponseLayout } from '@/types/responseView';
import { LAYOUTS } from './layouts';
import { ResponseLayoutControls } from './ResponseViewControls';

interface SubmittedResponseProps {
  sr: SubmittedResponseState;
  responseId: string;
  scope: string;
  /** The form definition is still loading: show a skeleton shaped like the chosen layout. */
  loading?: boolean;
  /** Editors only - shows "Set as form default" in the view options (the server enforces it as well). */
  canSetFormDefault?: boolean;
}

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

/**
 * The "Submitted response" card: the answers, in the layout the person chose. The layout switcher and the view options sit at the right
 * end of the card's header, right above what they change, and the header stays at the top while the answers scroll. Search is in the top bar.
 */
export function SubmittedResponse({ sr, responseId, scope, loading = false, canSetFormDefault = false }: SubmittedResponseProps) {
  const { layout, view, query, arranged, itemCount, revealEmpty, setRevealEmpty } = sr;
  const Layout = LAYOUTS[layout];
  const shared = { responseId, scope, showNumbers: view.showNumbers, density: view.density, query };

  return (
    <section aria-label="Submitted response" className="@container min-w-0 self-start rounded-lg border border-(--border-default) bg-(--surface-card)" data-layout={layout}>
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-t-lg border-b border-(--border-subtle) bg-(--surface-card) px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <h3 className="bg-body font-semibold text-(--text-primary)">Submitted response</h3>
          <p className="mt-0.5 bg-body-sm text-(--text-muted)">
            {loading || arranged.total === 0 ? 'All answers provided by the respondent.' : `${arranged.answered} of ${arranged.total} answered`}
          </p>
        </div>
        <ResponseLayoutControls sr={sr} canSetFormDefault={canSetFormDefault} />
      </div>

      <div className="px-4 pb-4 pt-1 sm:px-5">
        {loading ? (
          <LayoutSkeleton layout={layout} />
        ) : itemCount === 0 ? (
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
