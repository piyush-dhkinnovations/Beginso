'use client';

import { cn } from '@/lib/utils';

export type SettingsTab = 'profile' | 'workspace' | 'branding' | 'notifications' | 'security';

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
];

// Visual treatment mirrors BuilderTabs' underline-active style, but with real role="tablist"/
// role="tab"/aria-selected semantics — BuilderTabs itself turned out not to have these (verified
// while building this component, see tasks.md Day 1 Notes), so this isn't copied from it.
export function SettingsTabs({ activeTab, onChange, dirtyTabs }: SettingsTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Settings"
      className="settings-tabs-scroll flex items-center gap-1 border-b border-neutral-200 overflow-x-auto scroll-smooth pr-6"
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const isDirty = dirtyTabs?.has(tab.id);
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 px-3 sm:px-4 py-3 text-body-sm font-semibold whitespace-nowrap transition-all border-b-2 focus:outline-none min-h-11',
              isActive
                ? 'border-brand-700 text-brand-700'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 hover:border-neutral-200'
            )}
          >
            {tab.label}
            {isDirty && (
              <span className="h-1.5 w-1.5 rounded-full bg-brand-600" aria-label="Unsaved changes" />
            )}
          </button>
        );
      })}
    </div>
  );
}
