'use client';

import { Tabs, type TabItem } from '@/components/ui/Tabs';

export type FormsManagerTab = 'recent' | 'pinned' | 'draft' | 'published' | 'archived' | 'shared';

const TABS: TabItem[] = [
  { id: 'recent', label: 'Recent' },
  { id: 'pinned', label: 'Pinned' },
  { id: 'draft', label: 'Draft' },
  { id: 'published', label: 'Published' },
  { id: 'archived', label: 'Archived' },
  { id: 'shared', label: 'Shared with me' },
];

export interface FormsManagerTabsProps {
  activeTab: FormsManagerTab;
  onChange: (tab: FormsManagerTab) => void;
}

// requirements.md §7.10 — Recent/Pinned/Draft/Published/Archived/Shared with me, ui/Tabs wrapper.
// Pinned and Archived render placeholder content in the parent page rather than fabricating
// pin/unpin persistence or an archive status the backend doesn't yet support (design.md §23).
export function FormsManagerTabs({ activeTab, onChange }: FormsManagerTabsProps) {
  return <Tabs tabs={TABS} activeId={activeTab} onChange={(id) => onChange(id as FormsManagerTab)} />;
}
