'use client';

import { useRef } from 'react';
import { bx } from '@/lib/utils';

export type SettingsTab = 'profile' | 'workspace' | 'branding' | 'notifications' | 'security' | 'sessions' | 'tags' | 'stages' | 'scoring' | 'data';

interface SettingsTabsProps {
  activeTab: SettingsTab;
  onChange: (tab: SettingsTab) => void;
  /** Tabs with unsaved edits — renders a small dot next to the label (Requirement 12.2). */
  dirtyTabs?: Set<SettingsTab>;
  /** Which tabs to show, in canonical order. Omitted = all (the Account/Workspace pages each pass their own subset). */
  visible?: SettingsTab[];
  /** Per-page label overrides, e.g. 'workspace' reads "General" inside a workspace. */
  labels?: Partial<Record<SettingsTab, string>>;
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
  // Sprint 12 (inbox-collaboration), OQ-7 resolved 3 Oct 2026 (task 5.2). Same "no wireframe,
  // derived from StageManager's own list+edit pattern" precedent as the Stages tab above.
  { id: 'scoring', label: 'Scoring' },
  // Account-level export/delete — split out of the old Workspace tab.
  { id: 'data', label: 'Data & account' },
];

const GROUPS: { title: string; ids: SettingsTab[] }[] = [
  { title: 'General', ids: ['profile', 'workspace', 'branding', 'notifications'] },
  { title: 'Response handling', ids: ['tags', 'stages', 'scoring'] },
  { title: 'Account', ids: ['security', 'sessions', 'data'] },
];

// Vertical section nav (spec Phase 6): grouped, one column on desktop, a scrolling row below `lg`.
// Still the WAI-ARIA tabs pattern (role=tablist/tab, roving tabindex, arrow keys) so the existing
// "tabs stay mounted once visited" panels in SettingsView keep their semantics.
export function SettingsTabs({ activeTab, onChange, dirtyTabs, visible, labels }: SettingsTabsProps) {
  const refs = useRef<Partial<Record<SettingsTab, HTMLButtonElement | null>>>({});
  const shown = TABS.filter((tab) => (visible ? visible.includes(tab.id) : tab.id !== 'data'));
  const groups = GROUPS.map((g) => ({ ...g, tabs: shown.filter((t) => g.ids.includes(t.id)) })).filter((g) => g.tabs.length > 0);
  const flat = groups.flatMap((g) => g.tabs);

  function move(index: number) {
    const next = flat[(index + flat.length) % flat.length];
    onChange(next.id);
    refs.current[next.id]?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    const key = e.key;
    if (key === 'ArrowDown' || key === 'ArrowRight') move(index + 1);
    else if (key === 'ArrowUp' || key === 'ArrowLeft') move(index - 1);
    else if (key === 'Home') move(0);
    else if (key === 'End') move(flat.length - 1);
    else return;
    e.preventDefault();
  }

  return (
    <div
      role="tablist"
      aria-label="Settings"
      aria-orientation="vertical"
      className="settings-tabs-scroll flex gap-1 overflow-x-auto border-b border-(--border-default) pb-2 lg:sticky lg:top-24 lg:w-60 lg:shrink-0 lg:flex-col lg:gap-0.5 lg:self-start lg:overflow-visible lg:border-b-0 lg:border-r lg:pb-0 lg:pr-4"
    >
      {groups.map((group, gi) => (
        <div key={group.title} role="presentation" className={bx('flex gap-1 lg:flex-col lg:gap-0.5', gi > 0 && 'lg:mt-5 lg:border-t lg:border-(--border-default) lg:pt-4')}>
          {groups.length > 1 && (
            <p aria-hidden="true" className="hidden px-3 pb-1 bg-caption font-bold uppercase tracking-wider text-(--text-muted) lg:block">
              {group.title}
            </p>
          )}
          {group.tabs.map((tab) => {
            const selected = tab.id === activeTab;
            const index = flat.indexOf(tab);
            return (
              <button
                key={tab.id}
                ref={(el) => { refs.current[tab.id] = el; }}
                type="button"
                role="tab"
                id={`settings-tab-${tab.id}`}
                aria-selected={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => onChange(tab.id)}
                onKeyDown={(e) => onKeyDown(e, index)}
                className={bx(
                  'flex min-h-11 items-center justify-between gap-2 whitespace-nowrap rounded-md px-3 py-2 text-left bg-body-sm transition-colors',
                  selected
                    ? 'bg-(--surface-active) font-semibold text-(--accent-soft-text)'
                    : 'text-(--text-secondary) hover:bg-(--surface-hover) hover:text-(--text-primary)'
                )}
              >
                {labels?.[tab.id] ?? tab.label}
                {dirtyTabs?.has(tab.id) && (
                  <span className="h-1.5 w-1.5 rounded-full bg-(--action-primary)" aria-label="Unsaved changes" />
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
