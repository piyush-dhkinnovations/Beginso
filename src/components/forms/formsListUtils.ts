import type { Form, FormStatus } from '@/types/form';
import type { FormsContext } from '@/types/workspace';
import type { TableSort } from '@/components/ui/Table';
import type { FormsManagerTab } from '@/components/forms/FormsManagerTabs';

// ─── Status badge variant helper ─────────────────────────────────────────────

export const STATUS_VARIANT: Record<FormStatus, 'draft' | 'published' | 'closed'> = {
  draft: 'draft',
  published: 'published',
  closed: 'closed',
};

export const STATUS_LABEL: Record<FormStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  closed: 'Closed',
};

export const PAGE_SIZES = [10, 25, 50] as const;

// GET /api/forms sorts on the server (`sort` + `order`). These table keys map to its fields; "responses" is a
// computed count the server cannot sort by, so sortForms below still handles it (for the loaded page) and
// serves the other lists that sort client-side (Responses landing).
export const SERVER_SORT_FIELD: Record<string, 'title' | 'status' | 'updatedAt' | undefined> = {
  title: 'title',
  status: 'status',
  updated: 'updatedAt',
};

export function sortForms(forms: Form[], { key, dir }: TableSort): Form[] {
  const sign = dir === 'asc' ? 1 : -1;
  const cmp: Record<string, (a: Form, b: Form) => number> = {
    title: (a, b) => a.title.localeCompare(b.title),
    status: (a, b) => a.status.localeCompare(b.status),
    responses: (a, b) => a.responseCount - b.responseCount,
    updated: (a, b) => a.updatedAt.localeCompare(b.updatedAt),
  };
  return [...forms].sort((a, b) => sign * (cmp[key] ?? cmp.updated)(a, b));
}

// "26 Sep 2026, 12:30" — day-first, three-letter month, 24-hour. Built from parts because the en-GB
// locale spells September "Sept".
export const formatUpdated = (iso: string) => {
  const d = new Date(iso);
  const month = d.toLocaleString('en-US', { month: 'short' });
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return `${d.getDate()} ${month} ${d.getFullYear()}, ${time}`;
};

// Tabs backed by the forms list query (requirements.md §7.10). Pinned adds `pinned=true` (per-user).
export const TAB_STATUS: Partial<Record<FormsManagerTab, FormStatus | 'all'>> = {
  recent: 'all',
  pinned: 'all',
  draft: 'draft',
  published: 'published',
  closed: 'closed',
  // Sprint 13 (CF5.6): Archived is a real list now (`?archived=only`); every status shows there.
  archived: 'all',
};

export function formsQueryEnabled(tab: FormsManagerTab): boolean {
  return tab in TAB_STATUS;
}

// Every link this page builds into a form's own detail routes (edit/overview/responses/
// analytics) carries this hint when reached from a workspace context — PersonalShell reads it
// to paint the correct sidebar/context immediately on the next page, instead of flashing
// Personal while it re-fetches the form to figure out its workspace from scratch (real bug this
// fixes: crossing from /w/[slug]/forms into /forms/:id/edit unmounts WorkspaceShell entirely,
// so the next shell starts knowing nothing).
/** The full-page Create form flow, for the current space (a workspace's forms are created in that workspace). */
export function createFormHref(context: FormsContext): string {
  return context.type === 'workspace' ? `/forms/new?ws=${encodeURIComponent(context.workspaceId)}` : '/forms/new';
}

export function formHref(path: string, context: FormsContext): string {
  return context.type === 'workspace' ? `${path}?ws=${context.workspaceId}` : path;
}
