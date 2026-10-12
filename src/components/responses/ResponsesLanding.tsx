'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, FileText, Search } from 'lucide-react';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { FilterChips } from '@/components/ui/FilterChips';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { FormCard } from '@/components/forms/FormCard';
import { FormTile } from '@/components/forms/FormTile';
import { OwnerMonogram } from '@/components/forms/OwnerMonogram';
import { PAGE_SIZES, STATUS_LABEL as FORM_STATUS_LABEL, STATUS_VARIANT, formatUpdated, sortForms } from '@/components/forms/formsListUtils';
import { ListFooter } from '@/components/ui/ListFooter';
import { Select } from '@/components/ui/Select';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Table, type TableColumn, type TableSort } from '@/components/ui/Table';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { FormsViewToggle } from '@/components/forms/FormsViewToggle';
import { useFormsView } from '@/hooks/useFormsView';
import { formsService } from '@/services/forms';
import { formatRelativeTime } from '@/lib/formatters';
import type { Form } from '@/types/form';

const GRID = 'grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(300px,1fr))]';

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
  // The same list / grid choice as the Forms page, remembered per browser.
  const [view, setView] = useFormsView();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['responses-landing-forms', scope],
    queryFn: () => formsService.getAllForms(isWorkspace ? { type: 'workspace', workspaceId: scope } : { type: 'personal' }),
  });
  const forms = [...(data?.forms ?? [])].sort(
    (a, b) => b.responseCount - a.responseCount || +new Date(b.updatedAt) - +new Date(a.updatedAt),
  );
  const withCount = forms.filter((f) => f.responseCount > 0).length;
  const totalResponses = forms.reduce((sum, f) => sum + f.responseCount, 0);
  const maxResponses = Math.max(0, ...forms.map((f) => f.responseCount));
  const q = search.trim().toLowerCase();
  const visible = forms.filter(
    (f) => (show === 'all' || (show === 'with') === f.responseCount > 0) && (!q || f.title.toLowerCase().includes(q)),
  );
  const base = isWorkspace ? `/w/${scope}` : '';
  const formHref = (f: Form) => `/forms/${f._id}/inbox${isWorkspace ? `?ws=${encodeURIComponent(scope)}` : ''}`;

  const router = useRouter();
  const { user } = useAuth();
  const [sort, setSort] = useState<TableSort>({ key: 'updated', dir: 'desc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(10);
  const sorted = sortForms(visible, sort);
  const lastPage = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageRows = sorted.slice((Math.min(page, lastPage) - 1) * pageSize, Math.min(page, lastPage) * pageSize);
  const ownerOf = (f: Form) => (isWorkspace ? f.owner?.name : user?.name);
  const columns: TableColumn<Form>[] = [
    {
      key: 'form',
      header: 'Form Title',
      sortKey: 'title',
      render: (f) => (
        <div className="flex min-w-0 items-center gap-3">
          <FormTile title={f.title} size={40} logoUrl={f.branding?.logoUrl} />
          <div className="flex min-w-0 flex-col">
            <span className="truncate bg-body-sm font-semibold text-(--text-primary)">{f.title}</span>
            <span className="truncate bg-caption text-(--text-muted)">{ownerOf(f) ? `${ownerOf(f)} · ` : ''}created {formatRelativeTime(f.createdAt)}</span>
          </div>
        </div>
      ),
    },
    { key: 'owner', header: 'Owner', render: (f) => <OwnerMonogram name={ownerOf(f)} brandColor={f.branding?.primaryColor} title={f.title} /> },
    { key: 'status', header: 'Status', sortKey: 'status', render: (f) => <StatusBadge variant={STATUS_VARIANT[f.status]}>{FORM_STATUS_LABEL[f.status]}</StatusBadge> },
    { key: 'responses', header: 'Responses', sortKey: 'responses', render: (f) => <span className="bg-body-sm tabular-nums text-(--text-primary)">{f.responseCount}</span> },
    { key: 'updated', header: 'Updated', sortKey: 'updated', render: (f) => <span className="bg-body-sm text-(--text-secondary)">{formatUpdated(f.updatedAt)}</span> },
  ];

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
          <div className="flex w-full items-center gap-3 sm:w-auto">
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
          <FormsViewToggle value={view} onChange={setView} />
          </div>
        </div>
      )}

      {isLoading ? (
        <div className={GRID} aria-busy="true" aria-label="Loading forms">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="block" height={84} className="w-full rounded-lg" />
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
      ) : view === 'list' ? (
        // The same table as the Forms page (title with its logo, owner, status, responses, updated), opening a row goes to its responses.
        <div className="flex flex-col gap-3">
          <Table
            columns={columns}
            rows={pageRows}
            rowKey={(f) => f._id}
            dense
            sort={sort}
            onSortChange={(key) => setSort((cur) => (cur.key === key ? { key, dir: cur.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'title' || key === 'status' ? 'asc' : 'desc' }))}
            onRowClick={(f) => router.push(formHref(f))}
          />
          <ListFooter page={page} pageSize={pageSize} total={sorted.length} noun="form" onPageChange={setPage}>
            <div className="flex items-center gap-2">
              <label htmlFor="responses-page-size" className="bg-body-sm text-(--text-muted)">Rows per page</label>
              <div className="w-20">
                <Select id="responses-page-size" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value) as (typeof PAGE_SIZES)[number]); setPage(1); }}>
                  {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
                </Select>
              </div>
            </div>
          </ListFooter>
        </div>
      ) : (
        <ul className={`m-0 list-none p-0 ${GRID}`}>
          {/* The same card as the Forms page (logo, title, description, response bar, status and counts); it opens the form's responses. */}
          {visible.map((form) => (
            <li key={form._id} className="min-w-0">
              <FormCard form={form} href={formHref(form)} menu={null} maxResponses={maxResponses} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
