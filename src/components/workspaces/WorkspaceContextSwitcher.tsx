'use client';

import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ContextSwitcher } from '@/components/ui';
import type { ContextSwitcherTarget } from '@/components/ui';
import { workspacesService } from '@/services/workspaces';
import { searchKeys, workspaceKeys } from '@/lib/queryKeys';

export interface WorkspaceContextSwitcherProps {
  currentLabel?: string;
  collapsed?: boolean;
}

// Container: owns fetching the workspace list and navigating on selection. Delegates the actual
// dropdown rendering/keyboard-nav/focus-restore to ui/ContextSwitcher — this file has no
// interaction logic of its own (design.md §7's split of responsibilities).
export function WorkspaceContextSwitcher({ currentLabel = 'Personal', collapsed = false }: WorkspaceContextSwitcherProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: workspaces = [] } = useQuery({
    queryKey: workspaceKeys.list(),
    queryFn: workspacesService.list,
  });

  // The second line replaces the old unlabelled count badge: say who you are here and who else is.
  const current = currentLabel === 'Personal' ? undefined : workspaces.find((w) => w.name === currentLabel);
  const currentMeta =
    currentLabel === 'Personal'
      ? 'Only you'
      : current
        ? [
            current.role ? current.role.charAt(0).toUpperCase() + current.role.slice(1) : null,
            typeof current.memberCount === 'number' ? `${current.memberCount} ${current.memberCount === 1 ? 'member' : 'members'}` : null,
          ]
            .filter(Boolean)
            .join(' · ') || undefined
        : undefined;

  const handleSelect = (target: ContextSwitcherTarget) => {
    // Sprint 14 (task 3.14): search results are per context - drop them all on a switch so the palette
    // can never flash the previous context's rows. (Notification keys are context-namespaced, so the
    // badge simply reads the new scope's key.)
    queryClient.removeQueries({ queryKey: searchKeys.all });
    if (target.type === 'personal') {
      router.push('/dashboard');
    } else {
      router.push(`/w/${target.workspace.slug}`);
    }
  };

  return (
    <ContextSwitcher
      currentLabel={currentLabel}
      currentMeta={currentMeta}
      currentLogo={current?.logo}
      workspaces={workspaces}
      onSelect={handleSelect}
      collapsed={collapsed}
    />
  );
}
