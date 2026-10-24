'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsService } from '@/services/notifications';
import { notificationKeys } from '@/lib/queryKeys';
import { Calendar, FileText, Lock, MoreVertical, Search, Table2, Users, LayoutDashboard } from 'lucide-react';
import { sharedService } from '@/services/shared';
import { sharedKeys } from '@/lib/queryKeys';
import { ROLE_LABELS } from '@/lib/roles';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Menu } from '@/components/ui/Menu';
import { Table, type TableColumn } from '@/components/ui/Table';
import { Toolbar } from '@/components/ui/Toolbar';
import { EmptyState } from '@/components/ui/EmptyState';
import { CardGridSkeleton } from '@/components/ui/PageSkeletons';
import { FormTile } from '@/components/forms/FormTile';
import { FormsViewToggle } from '@/components/forms/FormsViewToggle';
import { PaginationControls } from '@/components/responses/PaginationControls';
import { SharedFormCard, formatSharedDate } from '@/components/team/SharedFormCard';
import { SharedRoleBadge } from '@/components/team/SharedRoleBadge';
import { useFormsView } from '@/hooks/useFormsView';
import type { SharedFormItem } from '@/types/team';

const PAGE_SIZES = [10, 25, 50] as const;
const PERSONAL = 'Personal';

type SortKey = 'latest' | 'oldest' | 'name';

const workspaceOf = (item: SharedFormItem) => item.workspaceName ?? PERSONAL;

// Shared with me (requirements.md §7.9, design.md §5/§15.6/§17) — Personal-space page, one
// useQuery(sharedKeys.list()). The endpoint returns the caller's whole list, so search, the
// workspace / owner / permission filters, sorting and pagination all run client-side and are exact.
// Two views, remembered per browser (same list/grid choice as the Forms page): a table and a card
// grid. Both link a form to its responses — the nearest existing view for a grant-only viewer.
export default function SharedWithMePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  // Opening the page is "seeing" the shares: clear the sidebar count and the bell rows for them.
  useEffect(() => {
    notificationsService
      .markAllRead('personal', 'form_shared')
      .then(() => queryClient.invalidateQueries({ queryKey: notificationKeys.all }))
      .catch(() => {});
  }, [queryClient]);
  const [view, setView] = useFormsView();
  const [search, setSearch] = useState('');
  const [workspace, setWorkspace] = useState('all');
  const [owner, setOwner] = useState('all');
  const [role, setRole] = useState('all');
  const [sort, setSort] = useState<SortKey>('latest');
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(10);
  const [page, setPage] = useState(1);

  const { data: shares, isLoading, isError, error, refetch } = useQuery({
    queryKey: sharedKeys.list(),
    queryFn: sharedService.list,
  });

  const isPermissionDenied = (error as { response?: { status?: number } })?.response?.status === 403;

  const all = useMemo(() => shares ?? [], [shares]);
  const workspaces = useMemo(() => [...new Set(all.map(workspaceOf))].sort(), [all]);
  const owners = useMemo(() => [...new Set(all.map((s) => s.sharedByName).filter((n): n is string => !!n))].sort(), [all]);
  const roles = useMemo(() => [...new Set(all.map((s) => s.role))], [all]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = all.filter(
      (s) =>
        (!term || s.title.toLowerCase().includes(term)) &&
        (workspace === 'all' || workspaceOf(s) === workspace) &&
        (owner === 'all' || s.sharedByName === owner) &&
        (role === 'all' || s.role === role),
    );
    if (sort === 'name') return list.sort((a, b) => a.title.localeCompare(b.title));
    return list.sort((a, b) => (sort === 'oldest' ? a.sharedAt.localeCompare(b.sharedAt) : b.sharedAt.localeCompare(a.sharedAt)));
  }, [all, search, workspace, owner, role, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const hasFilters = !!search || workspace !== 'all' || owner !== 'all' || role !== 'all';
  const resetPage = () => setPage(1);

  const rowMenu = (item: SharedFormItem) => (
    <Menu
      trigger={<MoreVertical className="bg-icon" />}
      triggerLabel="More Options"
      align="end"
      items={[
        { id: 'responses', label: 'View responses', icon: <Table2 className="bg-icon" />, onSelect: () => router.push(`/forms/${item.id}/inbox`) },
        { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="bg-icon" />, onSelect: () => router.push(`/forms/${item.id}/overview`) },
      ]}
    />
  );

  const columns: TableColumn<SharedFormItem>[] = [
    {
      key: 'form',
      header: 'Form Title',
      render: (item) => (
        <div className="flex min-w-0 items-center gap-3">
          <FormTile title={item.title} logoUrl={item.branding?.logoUrl} iconName={item.branding?.iconName} />
          <div className="flex min-w-0 flex-col">
            <Link href={`/forms/${item.id}/inbox`} className="bg-body-sm truncate font-semibold text-(--text-primary) hover:underline">
              {item.title}
            </Link>
            <span className="bg-caption truncate text-(--text-muted)">
              {workspaceOf(item)}
              {item.sharedByName && ` · Shared by ${item.sharedByName}`}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'owner',
      header: 'Shared by',
      render: (item) =>
        item.sharedByName ? (
          <div className="flex items-center gap-3">
            <Avatar name={item.sharedByName} size="sm" />
            <span className="bg-body-sm font-semibold text-(--text-primary)">{item.sharedByName}</span>
          </div>
        ) : (
          <span className="bg-body-sm text-(--text-disabled)">—</span>
        ),
    },
    { key: 'role', header: 'Permission', render: (item) => <SharedRoleBadge role={item.role} /> },
    {
      key: 'shared',
      header: 'Shared',
      render: (item) => (
        <span className="inline-flex items-center gap-2 bg-body-sm text-(--text-secondary)">
          <Calendar size={14} className="text-(--text-muted)" aria-hidden="true" />
          {formatSharedDate(item.sharedAt)}
        </span>
      ),
    },
    { key: 'actions', header: '', align: 'right', render: rowMenu },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Personal space"
        title="Shared with me"
        description={all.length > 0 ? `${all.length} form${all.length === 1 ? '' : 's'} · from ${workspaces.length} ${workspaces.length === 1 ? 'workspace' : 'workspaces'}` : undefined}
      />

      {isLoading ? (
        <CardGridSkeleton count={4} columns={2} />
      ) : isError ? (
        isPermissionDenied ? (
          <EmptyState illustration="no-access" icon={<Lock className="bg-icon" aria-hidden="true" />} title="You do not have access." />
        ) : (
          <EmptyState illustration="error"
            icon={<Users className="bg-icon" aria-hidden="true" />}
            title="Something went wrong."
            actions={
              <Button variant="secondary" onClick={() => void refetch()}>
                Retry
              </Button>
            }
          />
        )
      ) : all.length === 0 ? (
        // First run: nothing shared and nothing filtered — no controls over zero rows.
        <EmptyState illustration="team"
          icon={<Users className="bg-icon" aria-hidden="true" />}
          title="Nothing shared with you yet."
          description="When someone shares a form or invites you to collaborate outside a workspace, it will appear here."
          actions={
            <Link href="/dashboard">
              <Button variant="secondary">Back to Home</Button>
            </Link>
          }
        />
      ) : (
        <>
          <Toolbar>
            <div className="w-full sm:max-w-xs">
              <Input
                id="shared-search"
                aria-label="Search shared forms"
                placeholder="Search shared forms…"
                leftIcon={<Search className="bg-icon" />}
                value={search}
                onChange={(e) => { setSearch(e.target.value); resetPage(); }}
              />
            </div>
            <div className="sm:w-44">
              <Select id="shared-workspace" aria-label="Filter by workspace" value={workspace} onChange={(e) => { setWorkspace(e.target.value); resetPage(); }}>
                <option value="all">All workspaces</option>
                {workspaces.map((w) => <option key={w} value={w}>{w}</option>)}
              </Select>
            </div>
            {owners.length > 0 && (
              <div className="sm:w-40">
                <Select id="shared-owner" aria-label="Filter by who shared" value={owner} onChange={(e) => { setOwner(e.target.value); resetPage(); }}>
                  <option value="all">All owners</option>
                  {owners.map((o) => <option key={o} value={o}>{o}</option>)}
                </Select>
              </div>
            )}
            <div className="sm:w-40">
              <Select id="shared-role" aria-label="Filter by permission" value={role} onChange={(e) => { setRole(e.target.value); resetPage(); }}>
                <option value="all">All types</option>
                {roles.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </Select>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <FormsViewToggle value={view} onChange={setView} />
              <div className="w-44">
                <Select id="shared-sort" aria-label="Sort shared forms" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                  <option value="latest">Latest shared</option>
                  <option value="oldest">Oldest shared</option>
                  <option value="name">Name (A–Z)</option>
                </Select>
              </div>
            </div>
          </Toolbar>

          {filtered.length === 0 ? (
            <EmptyState
              illustration="no-results"
              icon={<FileText />}
              title="No shared forms match these filters"
              description={all.length ? `There ${all.length === 1 ? 'is 1 shared form' : `are ${all.length} shared forms`} in total.` : undefined}
              actions={
                hasFilters ? (
                  <Button
                    variant="secondary"
                    onClick={() => { setSearch(''); setWorkspace('all'); setOwner('all'); setRole('all'); resetPage(); }}
                  >
                    Clear filter
                  </Button>
                ) : undefined
              }
            />
          ) : view === 'list' ? (
            <Table columns={columns} rows={rows} rowKey={(item) => item.id} dense onRowClick={(item) => router.push(`/forms/${item.id}/inbox`)} />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 min-[120rem]:grid-cols-4 min-[150rem]:grid-cols-5">
              {rows.map((share) => (
                <SharedFormCard key={share.id} item={share} />
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="bg-caption text-(--text-muted)">
              {filtered.length} form{filtered.length !== 1 ? 's' : ''} shared with you
            </span>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label htmlFor="shared-page-size" className="bg-body-sm text-(--text-muted)">Rows per page</label>
                <div className="w-20">
                  <Select
                    id="shared-page-size"
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value) as (typeof PAGE_SIZES)[number]); resetPage(); }}
                  >
                    {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
                  </Select>
                </div>
              </div>
              <PaginationControls page={safePage} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
