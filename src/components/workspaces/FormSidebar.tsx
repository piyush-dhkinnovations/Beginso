'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ArrowLeft, FileText, LayoutDashboard, Table2, PieChart, Pencil, Settings } from 'lucide-react';
import { Sidebar } from '@/components/ui/Sidebar';
import { useBuilderStore } from '@/store/builderStore';
import type { Form } from '@/types/form';

export interface FormSidebarProps {
  formId: string;
  form: Form | undefined;
  collapsed?: boolean;
}

/**
 * Form-specific sidebar — replaces the global Personal sidebar while inside a single form's
 * detail routes (overview, responses, analytics, edit, settings). Every nav target already
 * exists as a real route; this is purely a navigation-chrome swap, not new pages. Preview and Scores
 * are deliberately not listed — their routes still exist (reached from the Overview page's Preview
 * button and "Score comparison" link) but they are not top-level destinations of a form.
 *
 * "Inbox" and "Responses" are intentionally one link, not two — there is only one such page built
 * (`/forms/:id/responses`). Labelled "Responses" here, not "Inbox": that's what the page itself
 * calls itself (its own H1 and breadcrumb) — "Inbox" is the separate workspace-side page's name
 * (`/w/[slug]/inbox`), a different route this sidebar never links to. Flagged rather than
 * silently duplicated: if a genuinely separate Inbox view is wanted later, this is where its own
 * nav item would go.
 */
export function FormSidebar({ formId, form, collapsed = false }: FormSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dirty = useBuilderStore((state) => state.dirty);
  const setPendingLeaveUrl = useBuilderStore((state) => state.setPendingLeaveUrl);
  const base = `/forms/${formId}`;
  const onEditPage = pathname === `${base}/edit`;
  const tab = searchParams.get('tab');
  const onSettingsTab = onEditPage && tab === 'settings';

  // Same guard PersonalSidebar/the legacy dashboard Sidebar already enforce — must be preserved
  // by whichever sidebar is actually mounted while the builder has unsaved changes, and this one
  // is now the sidebar mounted on /forms/:id/edit.
  const guard = (href: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (onEditPage && dirty) {
      event.preventDefault();
      setPendingLeaveUrl(href);
    }
  };

  const isActive = (suffix: string) => pathname === `${base}${suffix}` || pathname.startsWith(`${base}${suffix}/`);

  const statusDotColor = form?.status === 'published' ? 'var(--success)' : 'var(--text-muted)';

  const header = (
    <div className="flex flex-col gap-3 px-1">
      <Link
        href="/forms"
        onClick={guard('/forms')}
        className="flex items-start gap-2 rounded-md -mx-1 px-1 py-1 hover:bg-(--surface-hover)"
      >
        <ArrowLeft size={16} className="mt-0.5 shrink-0 text-(--text-secondary)" aria-hidden="true" />
        {!collapsed && (
          <span className="min-w-0">
            <span className="block bg-body-sm font-semibold text-(--text-primary)">Back to Dashboard</span>
            <span className="block bg-caption text-(--text-muted)">All forms, analytics, settings</span>
          </span>
        )}
      </Link>
      {!collapsed && (
        // Also a link back to Overview — the form's own name/status row is the natural "take me
        // home" target, same as clicking a site's logo.
        <Link
          href={`${base}/overview`}
          onClick={guard(`${base}/overview`)}
          className="flex items-center gap-2.5 min-w-0 rounded-md -mx-1 px-1 py-1.5 hover:bg-(--surface-hover)"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-(--accent-soft) text-(--accent-soft-text)">
            <FileText size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate bg-body-sm font-semibold text-(--text-primary)">{form?.title ?? 'Loading…'}</p>
            {form?.status && (
              <p className="flex items-center gap-1.5 bg-caption text-(--text-muted) capitalize">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: statusDotColor }} aria-hidden="true" />
                {form.status}
              </p>
            )}
          </div>
        </Link>
      )}
    </div>
  );

  return (
    <Sidebar
      collapsed={collapsed}
      header={header}
      groups={[
        {
          items: [
            // Bug fix: the Overview page (/forms/:id/overview — this form's own "home", stat
            // cards, recent responses, activity) had no sidebar entry at all, so nothing ever
            // highlighted while on it and there was no way back to it once you'd left. Labelled
            // "Overview" to match the page's own eyebrow label ("FORM OVERVIEW"), same reasoning
            // as the Responses label fix above.
            { label: 'Overview', href: `${base}/overview`, icon: LayoutDashboard, active: isActive('/overview'), onClick: guard(`${base}/overview`) },
            { label: 'Responses', href: `${base}/responses`, icon: Table2, active: isActive('/responses'), onClick: guard(`${base}/responses`) },
            { label: 'Analytics', href: `${base}/analytics`, icon: PieChart, active: isActive('/analytics'), onClick: guard(`${base}/analytics`) },
            { label: 'Edit form', href: `${base}/edit`, icon: Pencil, active: onEditPage && !onSettingsTab, onClick: guard(`${base}/edit`) },
            { label: 'Settings', href: `${base}/edit?tab=settings`, icon: Settings, active: onSettingsTab, onClick: guard(`${base}/edit?tab=settings`) },
          ],
        },
      ]}
    />
  );
}
