'use client';

import { Tabs, type TabItem } from '@/components/ui/Tabs';

export type SettingsTab = 'profile' | 'workspace' | 'branding' | 'notifications' | 'security' | 'sessions' | 'tags' | 'stages';

interface SettingsTabsProps {
  activeTab: SettingsTab;
  onChange: (tab: SettingsTab) => void;
  /** Tabs with unsaved edits — renders a small dot next to the label (Requirement 12.2). */
  dirtyTabs?: Set<SettingsTab>;
}

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'workspace', label: 'Workspace' },
  { id: 'branding', label: 'Branding' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'security', label: 'Security' },
  // sprint-10 requirements.md §7.12 — split out of Security, wireframe screen 18's exact label.
  { id: 'sessions', label: 'Sessions & Devices' },
  // Sprint 12 (inbox-collaboration), requirements.md §7.7 (task 2.5). No wireframe — derived
  // from RolesMatrix's list+edit pattern (design.md §15).
  { id: 'tags', label: 'Tags' },
  // Sprint 12 (inbox-collaboration), task 5.1. Same "no wireframe, derived from RolesMatrix's
  // list+edit pattern" precedent as the Tags tab above.
  { id: 'stages', label: 'Stages' },
];

// Rebuilt on ui/Tabs (sprint-10 requirements.md §7.13) — the hand-rolled version hardcoded
// text-neutral-*/border-neutral-* colours that never followed the theme. ui/Tabs also brings the
// WAI-ARIA roving-tabindex/arrow-key behaviour this strip didn't have. `.settings-tabs-scroll`
// stays: it is only the small-screen right-edge fade (globals.css), not a colour.
export function SettingsTabs({ activeTab, onChange, dirtyTabs }: SettingsTabsProps) {
  const tabs: TabItem[] = TABS.map((tab) => ({
    id: tab.id,
    label: (
      <>
        {tab.label}
        {dirtyTabs?.has(tab.id) && (
          <span
            className="h-1.5 w-1.5 rounded-full bg-[var(--action-primary)]"
            aria-label="Unsaved changes"
          />
        )}
      </>
    ),
  }));

  return (
    <Tabs
      tabs={tabs}
      activeId={activeTab}
      onChange={(id) => onChange(id as SettingsTab)}
      ariaLabel="Settings"
      className="settings-tabs-scroll"
    />
  );
}
