'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Plus, Building2, Search } from 'lucide-react';
import { workspacesService } from '@/services/workspaces';
import { workspaceKeys } from '@/lib/queryKeys';
import { ROLE_LABELS } from '@/lib/roles';
import { PageHeader, Button, Card, Badge, EmptyState, Skeleton } from '@/components/ui';
import { CreateWorkspaceModal } from '@/components/workspaces/CreateWorkspaceModal';

// Wireframe Screen 32: All Workspaces (requirements.md §7.5, C1.8) — lists every workspace
// the caller belongs to, with role, and is where "Create workspace" (PersonalSidebar's bottom action)
// lands. Displays eyebrow, title, description, filter bar (search + sort), and card grid with "Open" affordance.
export default function WorkspacesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'name' | 'last-used'>('last-used');

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
        description="Switch context without losing your place."
        actions={
          <Button variant="primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} className="mr-2" />
            Create workspace
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <Skeleton variant="title" width="60%" />
              <Skeleton variant="text" width="40%" />
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Card role="alert" className="flex items-center justify-between gap-4">
          <div>
            <p className="text-body-sm font-semibold">Unable to load workspaces</p>
            <p className="mt-1 text-caption text-[var(--text-muted)]">Please try again.</p>
          </div>
          <Button variant="secondary" size="small" onClick={() => void refetch()}>
            Try again
          </Button>
        </Card>
      ) : !workspaces || workspaces.length === 0 ? (
        <EmptyState
          icon={<Building2 className="bg-icon" aria-hidden="true" />}
          title="Create your first workspace"
          description="A workspace is shared with your team — forms, responses and members all live inside it."
          actions={
            <Button variant="primary" onClick={() => setIsModalOpen(true)}>
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
                className="bg-input w-full pl-9 pr-3 py-1.5 text-body-sm rounded-md border border-[var(--border-default)] focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
                aria-hidden="true"
              />
            </div>
            <select
              id="sort-workspaces-select"
              aria-label="Sort workspaces"
              value={sort}
              onChange={(e) => setSort(e.target.value as 'name' | 'last-used')}
              className="bg-input sm:w-40 py-1.5 px-3 text-body-sm rounded-md border border-[var(--border-default)] text-[var(--text-primary)] bg-[var(--surface-card)]"
            >
              <option value="last-used">Last used</option>
              <option value="name">Name</option>
            </select>
          </div>

          {filteredWorkspaces.length === 0 ? (
            <EmptyState
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
                <Link key={workspace.id} href={`/w/${workspace.slug}`} className="block h-full no-underline">
                  <Card className="flex flex-col justify-between gap-4 h-full transition-shadow hover:shadow-md border border-[var(--border-default)] hover:border-[var(--border-strong)]">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-body font-semibold text-[var(--text-primary)]">{workspace.name}</h3>
                        <Badge>{ROLE_LABELS[workspace.role]}</Badge>
                      </div>
                      {typeof workspace.memberCount === 'number' && (
                        <p className="text-caption text-[var(--text-muted)]">
                          {workspace.memberCount} member{workspace.memberCount !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                    <div className="flex justify-end pt-2 border-t border-[var(--border-default)]">
                      <span className="bg-btn bg-btn-secondary bg-btn-sm inline-flex items-center gap-1 text-caption pointer-events-none">
                        Open
                      </span>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      <CreateWorkspaceModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}

