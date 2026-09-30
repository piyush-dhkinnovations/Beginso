'use client';

import { useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { SettingsTabs, type SettingsTab } from '@/components/settings/SettingsTabs';
import { ProfileTab } from '@/components/settings/ProfileTab';
import { WorkspaceTab } from '@/components/settings/WorkspaceTab';
import { BrandingTab } from '@/components/settings/BrandingTab';
import { NotificationsTab } from '@/components/settings/NotificationsTab';
import { SecurityTab } from '@/components/settings/SecurityTab';
import { SessionsTab } from '@/components/settings/SessionsTab';
import { TagManager } from '@/components/settings/TagManager';
import { StageManager } from '@/components/settings/StageManager';
import { CriteriaManager } from '@/components/scoring/CriteriaManager';
import { useTagManagerScope } from '@/hooks/useTagManagerScope';
import { useStageManagerScope } from '@/hooks/useStageManagerScope';
import { useScoreCriteriaScope } from '@/hooks/useScoreCriteriaScope';

const VALID_TABS: SettingsTab[] = ['profile', 'workspace', 'branding', 'notifications', 'security', 'sessions', 'tags', 'stages', 'scoring'];

const TAB_LABEL: Record<SettingsTab, string> = {
  profile: 'Profile',
  workspace: 'Workspace',
  branding: 'Branding',
  notifications: 'Notifications',
  security: 'Security',
  sessions: 'Sessions & Devices',
  tags: 'Tags',
  stages: 'Stages',
  scoring: 'Scoring',
};

export default function SettingsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabFromUrl = searchParams.get('tab') as SettingsTab | null;
  const activeTab: SettingsTab = tabFromUrl && VALID_TABS.includes(tabFromUrl) ? tabFromUrl : 'profile';

  // Per-tab dirty state (Requirement 12.1/12.2).
  const [dirtyTabs, setDirtyTabs] = useState<Set<SettingsTab>>(new Set());
  const [pendingTab, setPendingTab] = useState<SettingsTab | null>(null);

  // Requirement 12.1: an unsaved edit on a tab must survive switching away and back. Rendering
  // tabs as `{activeTab === 'x' && <XTab/>}` unmounts the previous tab entirely on switch,
  // destroying its local RHF state — real bug, found while writing Property 1's test (a switched-
  // away-from tab's typed-but-unsaved value was lost on return, not preserved as required). Fixed
  // by keeping every tab mounted once first visited (CSS `hidden`, not JSX-omitted) rather than
  // never unmounting at all — still true that a tab never visited this session never fires its
  // query (design.md §20's "no over-fetching on mount" principle), since it never mounts until
  // its tab is actually clicked at least once.
  const [visitedTabs, setVisitedTabs] = useState<Set<SettingsTab>>(new Set([activeTab]));
  if (!visitedTabs.has(activeTab)) {
    setVisitedTabs(new Set(visitedTabs).add(activeTab));
  }

  const tagManagerScope = useTagManagerScope();
  const stageManagerScope = useStageManagerScope();
  const scoreCriteriaScope = useScoreCriteriaScope();

  function setTabDirty(tab: SettingsTab, isDirty: boolean) {
    setDirtyTabs((prev) => {
      const next = new Set(prev);
      if (isDirty) next.add(tab);
      else next.delete(tab);
      return next;
    });
  }

  function navigateToTab(tab: SettingsTab) {
    router.replace(`${pathname}?tab=${tab}`, { scroll: false });
  }

  function handleTabChange(tab: SettingsTab) {
    if (tab === activeTab) return;
    if (dirtyTabs.has(activeTab)) {
      setPendingTab(tab);
      return;
    }
    navigateToTab(tab);
  }

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <PageHeader title="Settings" description="Manage your profile, workspace, and account preferences." />

      <SettingsTabs activeTab={activeTab} onChange={handleTabChange} dirtyTabs={dirtyTabs} />

      {/* Branding gets its own wider column (BrandingPanel needs >=620px of container width to
          place Preview beside the colour card — see its container-query comment) — every other
          tab is a narrow single-column form and stays capped at 440px for readability. Capped at
          the same max-w-4xl BrandingPanel already applies to itself internally, not left
          unbounded — otherwise its own `mx-auto` has extra room to center it away from the left
          edge that every other tab's content starts flush against. */}
      <div className={activeTab === 'branding' ? 'max-w-4xl' : activeTab === 'tags' || activeTab === 'stages' || activeTab === 'scoring' ? '' : 'max-w-110'}>
        {visitedTabs.has('profile') && (
          <div className={activeTab === 'profile' ? '' : 'hidden'}>
            <ProfileTab onDirtyChange={(isDirty) => setTabDirty('profile', isDirty)} />
          </div>
        )}
        {visitedTabs.has('workspace') && (
          <div className={activeTab === 'workspace' ? '' : 'hidden'}>
            <WorkspaceTab onDirtyChange={(isDirty) => setTabDirty('workspace', isDirty)} />
          </div>
        )}
        {visitedTabs.has('branding') && (
          <div className={activeTab === 'branding' ? '' : 'hidden'}>
            <BrandingTab />
          </div>
        )}
        {visitedTabs.has('notifications') && (
          <div className={activeTab === 'notifications' ? '' : 'hidden'}>
            <NotificationsTab />
          </div>
        )}
        {visitedTabs.has('security') && (
          <div className={activeTab === 'security' ? '' : 'hidden'}>
            <SecurityTab />
          </div>
        )}
        {visitedTabs.has('sessions') && (
          <div className={activeTab === 'sessions' ? '' : 'hidden'}>
            <SessionsTab />
          </div>
        )}
        {visitedTabs.has('tags') && (
          <div className={activeTab === 'tags' ? '' : 'hidden'}>
            <TagManager scope={tagManagerScope} onDirtyChange={(isDirty) => setTabDirty('tags', isDirty)} />
          </div>
        )}
        {visitedTabs.has('stages') && (
          <div className={activeTab === 'stages' ? '' : 'hidden'}>
            <StageManager scope={stageManagerScope} onDirtyChange={(isDirty) => setTabDirty('stages', isDirty)} />
          </div>
        )}
        {visitedTabs.has('scoring') && (
          <div className={activeTab === 'scoring' ? '' : 'hidden'}>
            <CriteriaManager scope={scoreCriteriaScope} onDirtyChange={(isDirty) => setTabDirty('scoring', isDirty)} />
          </div>
        )}
      </div>

      <Modal
        isOpen={pendingTab !== null}
        onClose={() => setPendingTab(null)}
        title="Leave without saving?"
        description={`Your changes to ${TAB_LABEL[activeTab]} will be lost.`}
      >
        <div className="flex flex-col gap-3 pt-4 border-t border-[var(--border-subtle)]">
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              if (pendingTab) {
                setTabDirty(activeTab, false);
                navigateToTab(pendingTab);
              }
              setPendingTab(null);
            }}
          >
            Leave without saving
          </Button>
          <button
            type="button"
            onClick={() => setPendingTab(null)}
            className="min-h-11 text-body-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] underline underline-offset-2 py-1"
          >
            Stay
          </button>
        </div>
      </Modal>
    </div>
  );
}
