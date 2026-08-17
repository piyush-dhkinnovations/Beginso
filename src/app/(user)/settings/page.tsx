'use client';

import { useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { SettingsTabs, type SettingsTab } from '@/components/settings/SettingsTabs';
import { ProfileTab } from '@/components/settings/ProfileTab';
import { WorkspaceTab } from '@/components/settings/WorkspaceTab';
import { BrandingTab } from '@/components/settings/BrandingTab';
import { NotificationsTab } from '@/components/settings/NotificationsTab';
import { SecurityTab } from '@/components/settings/SecurityTab';

const VALID_TABS: SettingsTab[] = ['profile', 'workspace', 'branding', 'notifications', 'security'];

const TAB_LABEL: Record<SettingsTab, string> = {
  profile: 'Profile',
  workspace: 'Workspace',
  branding: 'Branding',
  notifications: 'Notifications',
  security: 'Security',
};

export default function SettingsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabFromUrl = searchParams.get('tab') as SettingsTab | null;
  const activeTab: SettingsTab = tabFromUrl && VALID_TABS.includes(tabFromUrl) ? tabFromUrl : 'profile';

  // Per-tab dirty state (Requirement 12.1/12.2) — only Profile reports today; other tabs' RHF
  // instances will call the same setter once they land Tue–Thu.
  const [dirtyTabs, setDirtyTabs] = useState<Set<SettingsTab>>(new Set());
  const [pendingTab, setPendingTab] = useState<SettingsTab | null>(null);

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
    <div className="flex flex-col gap-6 max-w-6xl mx-auto animate-fade-in">
      <DashboardHeader title="Settings" subtitle="Manage your profile, workspace, and account preferences." />

      <SettingsTabs activeTab={activeTab} onChange={handleTabChange} dirtyTabs={dirtyTabs} />

      <div className="max-w-[440px]">
        {activeTab === 'profile' && (
          <ProfileTab onDirtyChange={(isDirty) => setTabDirty('profile', isDirty)} />
        )}
        {activeTab === 'workspace' && (
          <WorkspaceTab onDirtyChange={(isDirty) => setTabDirty('workspace', isDirty)} />
        )}
        {activeTab === 'branding' && <BrandingTab />}
        {activeTab === 'notifications' && <NotificationsTab />}
        {activeTab === 'security' && <SecurityTab />}
      </div>

      <Modal
        isOpen={pendingTab !== null}
        onClose={() => setPendingTab(null)}
        title="Leave without saving?"
        description={`Your changes to ${TAB_LABEL[activeTab]} will be lost.`}
      >
        <div className="flex flex-col gap-3 pt-4 border-t border-neutral-100">
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
            className="min-h-11 text-body-sm text-neutral-500 hover:text-neutral-700 underline underline-offset-2 py-1"
          >
            Stay
          </button>
        </div>
      </Modal>
    </div>
  );
}
