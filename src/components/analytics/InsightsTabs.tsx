'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Tabs, type TabItem } from '@/components/ui/Tabs';
import { useWorkspaceRole } from '@/hooks/useWorkspaceRole';
import { canViewExports } from '@/lib/roles';

export type InsightsTab = 'overview' | 'exports';

/** `?tab=` is validated against the allowed set; anything else falls back to Overview (design.md §14). */
export function parseInsightsTab(raw: string | null, exportsAllowed: boolean): InsightsTab {
  return raw === 'exports' && exportsAllowed ? 'exports' : 'overview';
}

/** Whether the caller may see the Exports tab - convenience only, the server enforces (reports route). */
export function useInsightsTab(scope: string): { tab: InsightsTab; exportsAllowed: boolean } {
  const searchParams = useSearchParams();
  const exportsAllowed = canViewExports(useWorkspaceRole(scope));
  return { tab: parseInsightsTab(searchParams.get('tab'), exportsAllowed), exportsAllowed };
}

interface InsightsTabsProps {
  scope: string;
}

// Sprint 14 (requirements 1.1, task 3.6b): Overview | Exports, deep-linkable as ?tab=exports. Renders
// only the tab strip - the page decides what each tab shows, so no data moves through this component.
// The Exports tab is hidden (not disabled) for a caller without access.
export function InsightsTabs({ scope }: InsightsTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { tab, exportsAllowed } = useInsightsTab(scope);

  if (!exportsAllowed) return null;

  const tabs: TabItem[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'exports', label: 'Exports' },
  ];

  function change(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (id === 'overview') params.delete('tab');
    else params.set('tab', id);
    // `page` means "forms page" on Overview and "jobs page" on Exports - never carry it across.
    params.delete('page');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  return <Tabs tabs={tabs} activeId={tab} onChange={change} ariaLabel="Insights sections" />;
}
