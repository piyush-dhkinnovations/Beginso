'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Plus, Building2 } from 'lucide-react';
import { workspacesService } from '@/services/workspaces';
import { workspaceKeys } from '@/lib/queryKeys';
import { PageHeader, Button, Card, Badge, EmptyState, Skeleton } from '@/components/ui';
import { CreateWorkspaceModal } from '@/components/workspaces/CreateWorkspaceModal';

// All Workspaces (requirements.md §7.5, C1.8) — lists every workspace the caller belongs to,
// with role, and is where "Create workspace" (the PersonalSidebar's own bottom action, A1.3)
// actually lands. Card grid, not a Table — a workspace is a navigable destination with a name
// and role, closer to a clickable tile than tabular data (design.md §5).
export default function WorkspacesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: workspaces, isLoading, isError, refetch } = useQuery({
    queryKey: workspaceKeys.list(),
    queryFn: workspacesService.list,
  });

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      <PageHeader
        title="Workspaces"
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
            <p className="mt-1 text-caption text-neutral-500">Please try again.</p>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {workspaces.map((workspace) => (
            <Link key={workspace.id} href={`/w/${workspace.slug}`} className="block">
              <Card className="flex flex-col gap-2 h-full transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-body font-semibold text-neutral-900">{workspace.name}</h3>
                  <Badge>{workspace.role}</Badge>
                </div>
                {typeof workspace.memberCount === 'number' && (
                  <p className="text-caption text-neutral-500">
                    {workspace.memberCount} member{workspace.memberCount !== 1 ? 's' : ''}
                  </p>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}

      <CreateWorkspaceModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
