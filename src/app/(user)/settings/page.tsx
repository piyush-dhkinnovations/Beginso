'use client';

import { useSearchParams } from 'next/navigation';
import { SettingsView } from '@/components/settings/SettingsView';
import { LegacySettingsRedirect, LEGACY_WORKSPACE_TABS } from '@/components/settings/LegacySettingsRedirect';
import type { SettingsTab } from '@/components/settings/SettingsTabs';

// Account settings only — the person, not any workspace. Workspace-owned settings (General,
// Branding, Tags, Stages, Scoring) live at /w/[slug]/settings.
const ACCOUNT_TABS: SettingsTab[] = ['profile', 'notifications', 'security', 'sessions', 'data'];

export default function SettingsPage() {
  const tab = useSearchParams().get('tab');
  // Old bookmarks like /settings?tab=tags: send them to the workspace they now belong to.
  if (tab && LEGACY_WORKSPACE_TABS.includes(tab)) return <LegacySettingsRedirect tab={tab} />;

  return <SettingsView title="Account settings" description="Manage your profile, security, and notification preferences." tabs={ACCOUNT_TABS} />;
}
