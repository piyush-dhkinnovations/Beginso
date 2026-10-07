'use client';

import { FilterChips, type FilterChip } from '@/components/ui/FilterChips';

export type FormsManagerTab = 'recent' | 'pinned' | 'draft' | 'published' | 'closed' | 'archived';

const TABS: { id: FormsManagerTab; label: string }[] = [
  { id: 'recent', label: 'All' },
  { id: 'published', label: 'Published' },
  { id: 'draft', label: 'Draft' },
  { id: 'closed', label: 'Closed' },
  { id: 'pinned', label: 'Pinned' },
  { id: 'archived', label: 'Archived' },
];

export interface FormsManagerTabsProps {
  activeTab: FormsManagerTab;
  onChange: (tab: FormsManagerTab) => void;
  /** Real counts only; a tab absent from this map renders without a number. */
  counts?: Partial<Record<FormsManagerTab, number>>;
}

// Count filter chips (All · Published · Draft · Closed · Pinned · Archived) instead of a tab strip.
export function FormsManagerTabs({ activeTab, onChange, counts }: FormsManagerTabsProps) {
  const chips: FilterChip[] = TABS.map((t) => ({ ...t, count: counts?.[t.id] }));
  return <FilterChips chips={chips} activeId={activeTab} onChange={(id) => onChange(id as FormsManagerTab)} ariaLabel="Filter forms by status" />;
}
