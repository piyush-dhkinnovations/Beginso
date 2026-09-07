'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ContextSwitcher } from '@/components/ui';
import type { ContextSwitcherTarget } from '@/components/ui';
import { workspacesService } from '@/services/workspaces';
import { workspaceKeys } from '@/lib/queryKeys';

export interface WorkspaceContextSwitcherProps {
  currentLabel?: string;
}

// Container: owns fetching the workspace list and navigating on selection. Delegates the actual
// dropdown rendering/keyboard-nav/focus-restore to ui/ContextSwitcher — this file has no
// interaction logic of its own (design.md §7's split of responsibilities).
export function WorkspaceContextSwitcher({ currentLabel = 'Personal' }: WorkspaceContextSwitcherProps) {
  const router = useRouter();
  const { data: workspaces = [] } = useQuery({
    queryKey: workspaceKeys.list(),
    queryFn: workspacesService.list,
  });

  const handleSelect = (target: ContextSwitcherTarget) => {
    if (target.type === 'personal') {
      router.push('/dashboard');
    } else {
      router.push(`/w/${target.workspace.slug}`);
    }
  };

  return <ContextSwitcher currentLabel={currentLabel} workspaces={workspaces} onSelect={handleSelect} />;
}
