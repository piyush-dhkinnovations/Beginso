'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ArrowRight, FileText, Search } from 'lucide-react';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { FilterChips } from '@/components/ui/FilterChips';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { FormTile } from '@/components/forms/FormTile';
import { formsService } from '@/services/forms';
import { formatRelativeTime } from '@/lib/formatters';
import type { Form, FormStatus } from '@/types/form';

const STATUS_LABEL: Record<FormStatus, string> = { draft: 'Draft', published: 'Published', closed: 'Closed' };
const GRID = 'grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]';

type Show = 'all' | 'with' | 'none';

interface ResponsesLandingProps {
  /** Workspace slug, or 'personal'. */
  scope?: string;
}

// The sidebar's "Responses" destination: pick a form, then land on its Summary / Responses page
// (/forms/:id/inbox). Forms that have responses come first; empty drafts sit behind them.
export function ResponsesLanding({ scope = 'personal' }: ResponsesLandingProps) {
  const isWorkspace = scope !== 'personal';
  const [search, setSearch] = useState('');
  const [show, setShow] = useState<Show>('all');
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['responses-landing-forms', scope],
    queryFn: () => formsService.getAllForms(isWorkspace ? { type: 'workspace', workspaceId: scope } : { type: 'personal' }),
  });
  const forms = [...(data?.forms ?? [])].sort(
    (a, b) => b.responseCount - a.responseCount || +new Date(b.updatedAt) - +new Date(a.updatedAt),
  );
  const withCount = forms.filter((f) => f.responseCount > 0).length;
  const totalResponses = forms.reduce((sum, f) => sum + f.responseCount, 0);
  const q = search.trim().toLowerCase();
  const visible = forms.filter(
    (f) => (show === 'all' || (show === 'with') === f.responseCount > 0) && (!q || f.title.toLowerCase().includes(q)),
  );
  const base = isWorkspace ? `/w/${scope}` : '';
  const formHref = (f: Form) => `/forms/${f._id}/inbox${isWorkspace ? `?ws=${encodeURIComponent(scope)}` : ''}`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Responses"
        description={
          forms.length > 0
            ? `${forms.length} ${forms.length === 1 ? 'form' : 'forms'} · ${totalResponses.toLocaleString()} ${totalResponses === 1 ? 'response' : 'responses'}. Pick a form to read its responses and see its summary.`
            : 'Pick a form to read its responses and see its summary.'
        }
      />

      {forms.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <FilterChips
            ariaLabel="Show forms"
            activeId={show}
            onChange={(id) => setShow(id as Show)}
            chips={[
              { id: 'all', label: 'All forms', count: forms.length },
              { id: 'with', label: 'With responses', count: withCount },
              { id: 'none', label: 'No responses yet', count: forms.length - withCount },
            ]}
          />
          <div className="w-full sm:w-72">
            <Input
              id="responses-landing-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search forms…"
              aria-label="Search forms"
              leftIcon={<Search size={16} />}
            />
          </div>
        </div>
      )}

      {isLoading ? (
        <div className={GRID} aria-busy="true" aria-label="Loading forms">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="block" height={148} className="w-full rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          icon={<AlertCircle />}
          title="Unable to load your forms"
          actions={<Button variant="secondary" size="small" onClick={() => void refetch()}>Try again</Button>}
        />
      ) : forms.length === 0 ? (
        <EmptyState
          icon={<FileText />}
          title="No forms yet"
          description="Create a form and share it. Its responses will show up here."
          actions={<ButtonLink href={`${base}/forms`}>Go to Forms</ButtonLink>}
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<Search />}
          title="No forms match"
          description="Try a different name, or show all forms."
          actions={<Button variant="secondary" size="small" onClick={() => { setSearch(''); setShow('all'); }}>Clear filters</Button>}
        />
      ) : (
        <ul className={`m-0 list-none p-0 ${GRID}`}>
          {visible.map((form) => {
            const empty = form.responseCount === 0;
            return (
              <li key={form._id} className="min-w-0">
                <Link href={formHref(form)} className="group block h-full no-underline focus-visible:outline-2 focus-visible:outline-(--border-focus)">
                  <Card className="flex h-full flex-col gap-4 transition-colors group-hover:border-(--border-focus)">
                    <div className="flex items-start gap-3">
                      <FormTile title={form.title} />
                      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <h3 className="min-w-0 truncate bg-body font-semibold text-(--text-primary)">{form.title}</h3>
                        <div><StatusBadge variant={form.status}>{STATUS_LABEL[form.status]}</StatusBadge></div>
                      </div>
                      <ArrowRight size={16} aria-hidden="true" className="mt-1 shrink-0 text-(--text-muted) transition-transform group-hover:translate-x-0.5 group-hover:text-(--text-link)" />
                    </div>
                    <div className="mt-auto flex items-end justify-between gap-3 border-t border-(--border-subtle) pt-3">
                      {empty ? (
                        <span className="bg-body-sm text-(--text-muted)">No responses yet</span>
                      ) : (
                        <span className="flex items-baseline gap-1.5">
                          <strong className="bg-h4 tabular-nums text-(--text-primary)">{form.responseCount.toLocaleString()}</strong>
                          <span className="bg-body-sm text-(--text-muted)">{form.responseCount === 1 ? 'response' : 'responses'}</span>
                        </span>
                      )}
                      <span className="bg-caption text-(--text-muted)">Updated {formatRelativeTime(form.updatedAt)}</span>
                    </div>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
