'use client';

import { useParams } from 'next/navigation';
import { SettingsView } from '@/components/settings/SettingsView';
import { Skeleton } from '@/components/ui/Skeleton';
import { useWorkspaceRole } from '@/hooks/useWorkspaceRole';
import { canManageScoring, canManageStages, canManageTags, canManageWorkspaceSettings } from '@/lib/roles';
import type { SettingsTab } from '@/components/settings/SettingsTabs';

// Workspace settings — everything that belongs to the workspace, not the signed-in person.
// Each tab is role-gated; the backend enforces the same rules (hiding a tab is a convenience).
export default function WorkspaceSettingsPage() {
  const { slug } = useParams<{ slug: string }>();
  const role = useWorkspaceRole(slug);

  if (!role) return <Skeleton variant="text" width="100%" height={96} />;

  const tabs: SettingsTab[] = [
    ...(canManageWorkspaceSettings(role) ? (['workspace', 'branding'] as const) : []),
    ...(canManageTags(role) ? (['tags'] as const) : []),
    ...(canManageStages(role) ? (['stages'] as const) : []),
    ...(canManageScoring(role) ? (['scoring'] as const) : []),
    'notifications', // every member has their own response-email preference
  ];

  return (
    <SettingsView
      title="Workspace settings"
      description="Manage this workspace's name, branding, tags, stages, and scoring, and choose which response emails you get."
      tabs={tabs}
      scope={slug}
      labels={{ workspace: 'General' }}
    />
  );
}
