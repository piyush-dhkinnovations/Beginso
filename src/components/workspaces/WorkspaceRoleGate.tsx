'use client';

import { useQuery } from '@tanstack/react-query';
import { Lock } from 'lucide-react';
import { workspacesService } from '@/services/workspaces';
import { workspaceKeys } from '@/lib/queryKeys';
import { PageHeader, EmptyState } from '@/components/ui';
import type { Role } from '@/types/workspace';

// Page-level counterpart of the sidebar's role-filtered nav (same predicates from lib/roles.ts).
// Convenience only: the server enforces. Renders nothing until the caller's role is known, then
// either the page or a no-access state. If the workspace list itself fails, the page renders and
// the server's own 403 handling applies.
export function WorkspaceRoleGate({
  slug,
  allow,
  title,
  children,
}: {
  slug: string;
  allow: (role: Role | undefined) => boolean;
  title: string;
  children: React.ReactNode;
}) {
  const { data, isError } = useQuery({ queryKey: workspaceKeys.list(), queryFn: workspacesService.list });
  if (!data && !isError) return null;
  if (data && !allow(data.find((w) => w.slug === slug)?.role)) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title={title} />
        <EmptyState illustration="no-access" icon={<Lock className="bg-icon" aria-hidden="true" />} title={`You do not have access to ${title.toLowerCase()}.`} />
      </div>
    );
  }
  return <>{children}</>;
}
