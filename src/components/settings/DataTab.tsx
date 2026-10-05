'use client';

import { useQuery } from '@tanstack/react-query';
import { settingsService } from '@/services/settings';
import { settingsKeys } from '@/lib/queryKeys';
import { Skeleton } from '@/components/ui/Skeleton';
import { DangerZoneSection } from './DangerZoneSection';

// Account-level data export and deletion — split out of WorkspaceTab so they stay with the
// account when workspace settings move to /w/[slug]/settings. Shares WorkspaceTab's cache entry.
export function DataTab() {
  const { data: workspace, isLoading } = useQuery({
    queryKey: settingsKeys.workspace(),
    queryFn: () => settingsService.getWorkspace(),
  });
  if (isLoading) return <Skeleton variant="text" width="100%" height={96} />;
  if (!workspace) return <p className="bg-body-sm text-(--text-muted)">Unable to load your account data options.</p>;
  return <DangerZoneSection workspaceName={workspace.name} />;
}
