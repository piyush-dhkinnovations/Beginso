'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { workspacesService } from '@/services/workspaces';
import { workspaceKeys } from '@/lib/queryKeys';
import { canManageWorkspaceSettings } from '@/lib/roles';
import { Skeleton } from '@/components/ui/Skeleton';

export const LEGACY_WORKSPACE_TABS = ['workspace', 'branding', 'tags', 'stages', 'scoring'];

/** /settings?tab=<workspace tab> -> the caller's first managed workspace's settings, else Account settings. */
export function LegacySettingsRedirect({ tab }: { tab: string }) {
  const router = useRouter();
  const { data, isError } = useQuery({ queryKey: workspaceKeys.list(), queryFn: () => workspacesService.list(), staleTime: 5 * 60_000 });

  useEffect(() => {
    if (!data && !isError) return;
    const ws = data?.find((w) => canManageWorkspaceSettings(w.role));
    router.replace(ws ? `/w/${ws.slug}/settings?tab=${tab}` : '/settings');
  }, [data, isError, router, tab]);

  return <Skeleton variant="text" width="100%" height={96} />;
}
