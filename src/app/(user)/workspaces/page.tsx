'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Building2, Search } from 'lucide-react';
import { workspacesService } from '@/services/workspaces';
import { workspaceKeys } from '@/lib/queryKeys';
import { ROLE_LABELS } from '@/lib/roles';
import { PageHeader, Button, ButtonLink, Card, Badge, EmptyState } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { LeaveWorkspaceModal } from '@/components/workspaces/LeaveWorkspaceModal';
import { WorkspaceLogo } from '@/components/workspaces/WorkspaceLogo';
import { CardGridSkeleton } from '@/components/ui/PageSkeletons';
import type { WorkspaceListItem } from '@/types/workspace';

// Wireframe Screen 32: All Workspaces (requirements.md §7.5, C1.8) — lists every workspace
// the caller belongs to, with role, and is where "Create workspace" (PersonalSidebar's bottom action)
// lands. Displays eyebrow, title, description, filter bar (search + sort), and card grid with "Open" affordance.
export default function WorkspacesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'name' | 'last-used'>('last-used');
  const [leaving, setLeaving] = useState<{ slug: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState<WorkspaceListItem | null>(null);
  const [typedName, setTypedName] = useState('');

  const deleteMutation = useMutation({
    mutationFn: (slug: string) => workspacesService.delete(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.list() });
      toast('Workspace deleted.', 'success');
      setDeleting(null);
    },
    onError: () => toast('Could not delete workspace. Please try again.', 'error'),
  });

  const { data: workspaces, isLoading, isError, refetch } = useQuery({
    queryKey: workspaceKeys.list(),
    queryFn: workspacesService.list,
  });

  const filteredWorkspaces = useMemo(() => {
    if (!workspaces) return [];
    let list = workspaces.filter((w) =>
      w.name.toLowerCase().includes(search.toLowerCase().trim())
    );
    if (sort === 'name') {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [workspaces, search, sort]);

  return (
    <div className="flex flex-col gap-4 w-full">
      <PageHeader
        eyebrow="Account"
        title="All workspaces"
        actions={
          <Button variant="primary" onClick={() => router.push('/workspaces/new')}>
            <Plus size={16} className="mr-2" />
            Create workspace
          </Button>
        }
      />

      {isLoading ? (
        <CardGridSkeleton count={3} />
      ) : isError ? (
        <Card role="alert" className="flex items-center justify-between gap-4">
          <div>
            <p className="bg-body-sm font-semibold">Unable to load workspaces</p>
            <p className="mt-1 bg-caption text-(--text-muted)">Please try again.</p>
          </div>
          <Button variant="secondary" size="small" onClick={() => void refetch()}>
            Try again
          </Button>
        </Card>
      ) : !workspaces || workspaces.length === 0 ? (
        <EmptyState illustration="team"
          icon={<Building2 className="bg-icon" aria-hidden="true" />}
          title="Create your first workspace"
          description="A workspace is shared with your team — forms, responses and members all live inside it."
          actions={
            <Button variant="primary" onClick={() => router.push('/workspaces/new')}>
              <Plus size={16} className="mr-2" />
              Create workspace
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {/* Filter and search bar from wireframe Screen 32 */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 sm:max-w-xs">
              <input
                id="search-workspaces-input"
                type="text"
                placeholder="Search workspaces..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search workspaces"
                className="bg-input w-full pl-9 pr-3 py-1.5 bg-body-sm rounded-md border border-(--border-default) focus:outline-none focus:ring-2 focus:ring-(--border-focus)"
              />
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-(--text-muted) pointer-events-none"
                aria-hidden="true"
              />
            </div>
            <select
              id="sort-workspaces-select"
              aria-label="Sort workspaces"
              value={sort}
              onChange={(e) => setSort(e.target.value as 'name' | 'last-used')}
              className="bg-input sm:w-40 py-1.5 px-3 bg-body-sm rounded-md border border-(--border-default) text-(--text-primary) bg-(--surface-card)"
            >
              <option value="last-used">Last used</option>
              <option value="name">Name</option>
            </select>
          </div>

          {filteredWorkspaces.length === 0 ? (
            <EmptyState illustration="no-results"
              icon={<Search className="bg-icon" aria-hidden="true" />}
              title="No workspaces found"
              description="No workspaces match your search term."
              actions={
                <Button variant="secondary" onClick={() => setSearch('')}>
                  Clear search
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredWorkspaces.map((workspace) => (
                <Card key={workspace.id} className="flex flex-col justify-between gap-4 h-full transition-shadow hover:shadow-(--shadow-hover) border border-(--border-default) hover:border-(--border-strong)">
                  <Link href={`/w/${workspace.slug}`} className="flex items-start gap-3 no-underline">
                    <WorkspaceLogo logo={workspace.logo} />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <h3 className="bg-body line-clamp-2 break-words font-semibold text-(--text-primary)">{workspace.name}</h3>
                      {typeof workspace.memberCount === 'number' && (
                        <p className="bg-caption text-(--text-muted)">
                          {workspace.memberCount} member{workspace.memberCount !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                    <Badge>{ROLE_LABELS[workspace.role]}</Badge>
                  </Link>
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-(--border-default)">
                    {workspace.isOwner ? (
                      <Button variant="ghost" size="small" aria-label={`Delete ${workspace.name}`} onClick={() => { setTypedName(''); setDeleting(workspace); }}>
                        Delete
                      </Button>
                    ) : (
                      <Button variant="ghost" size="small" aria-label={`Leave ${workspace.name}`} onClick={() => setLeaving({ slug: workspace.slug, name: workspace.name })}>
                        Leave
                      </Button>
                    )}
                    <ButtonLink href={`/w/${workspace.slug}`} variant="secondary" size="small">
                      Open
                    </ButtonLink>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      <LeaveWorkspaceModal workspace={leaving} onClose={() => setLeaving(null)} />

      {/* Per-workspace delete — only for owners */}
      <Modal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        title={deleting ? `Delete "${deleting.name}"?` : 'Delete workspace?'}
      >
        <div className="flex flex-col gap-4 pt-2">
          {(deleting?.memberCount ?? 0) > 1 ? (
            // Has other members — owner must transfer first
            <div role="alert" className="rounded-md border border-(--error-border) bg-(--error-surface) p-3 bg-body-sm text-(--error-text)">
              <p className="font-semibold">You are the only owner.</p>
              <p className="mt-1">Transfer ownership to another member before deleting, or remove all other members first.</p>
            </div>
          ) : (
            <>
              <div role="alert" className="rounded-md border border-(--error-border) bg-(--error-surface) p-3 bg-body-sm text-(--error-text)">
                <p className="font-semibold">This cannot be undone.</p>
                <p className="mt-1">All forms, responses and files in this workspace will be permanently deleted.</p>
              </div>
              <div>
                <label htmlFor="delete-ws-list-name" className="block bg-body-sm text-(--text-secondary) mb-1.5">
                  Type <span className="font-semibold text-(--text-primary)">{deleting?.name}</span> to confirm
                </label>
                <input
                  id="delete-ws-list-name"
                  type="text"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder={deleting?.name}
                  disabled={deleteMutation.isPending}
                  autoComplete="off"
                  className="w-full bg-(--bg-page) text-(--text-primary) border border-(--border-strong) rounded-md px-3 py-2 bg-body focus:outline-none focus:border-(--border-focus) focus:ring-2 focus:ring-(--border-default) transition-colors"
                />
              </div>
            </>
          )}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-(--border-subtle)">
            <Button variant="secondary" onClick={() => setDeleting(null)} disabled={deleteMutation.isPending}>Cancel</Button>
            {(deleting?.memberCount ?? 0) <= 1 && (
              <Button
                variant="destructive"
                isLoading={deleteMutation.isPending}
                disabled={typedName !== deleting?.name}
                onClick={() => deleting && void deleteMutation.mutateAsync(deleting.slug).then(() => setDeleting(null))}
              >
                Delete workspace permanently
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}

