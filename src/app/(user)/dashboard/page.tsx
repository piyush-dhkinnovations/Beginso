'use client';

import Link from 'next/link';
import { Plus, LayoutTemplate, PlusCircle, FileText } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { dashboardService } from '@/services/dashboard';
import { formsService } from '@/services/forms';
import { dashboardKeys, workspaceKeys } from '@/lib/queryKeys';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { StatisticsCards } from '@/components/dashboard/StatisticsCards';
import { RecentActivitySection } from '@/components/dashboard/RecentActivitySection';
import { Card, EmptyState, PageHeader, Skeleton, StatusBadge } from '@/components/ui';
import type { FormStatus } from '@/types/form';

const STATUS_VARIANT: Record<FormStatus, 'draft' | 'published' | 'closed'> = {
  draft: 'draft',
  published: 'published',
  closed: 'closed',
};
const STATUS_LABEL: Record<FormStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  closed: 'Closed',
};

const YOUR_FORMS_LIMIT = 5;

// Personal Home (A1.4) — rebuilt against the actual wireframe
// (Beginso-Design-System/.../wireframes/index.html, personalHomeContent()), not just the master
// feature list's one-line description. Layout: eyebrow + welcome heading + "Create a form"
// action, two quick-action cards (create / browse templates), a "Your forms" preview list with
// "View all", then recent activity — replacing the earlier stat-cards + 3-button quick-actions
// layout, which didn't match the wireframe at all.
export default function DashboardPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  const { data: analytics, isLoading: analyticsLoading, isError, refetch } = useQuery({
    queryKey: dashboardKeys.analytics(),
    queryFn: dashboardService.getAnalytics,
    // Don't fetch until auth has finished loading AND actually succeeded —
    // otherwise a stale/missing session can render the dashboard shell for a
    // frame before the axios interceptor's 401 redirect fires.
    enabled: !authLoading && isAuthenticated,
  });

  const { data: formsData, isLoading: formsLoading } = useQuery({
    queryKey: workspaceKeys.forms({ type: 'personal' }, { page: 1, limit: YOUR_FORMS_LIMIT }),
    // Real bug found and fixed: never told the backend this was a personal-space request, so it
    // fell back to the caller's default workspace and showed workspace forms here too
    // (src/services/forms.ts's own comment has the full root-cause).
    queryFn: () => formsService.getForms({ page: 1, limit: YOUR_FORMS_LIMIT }, { type: 'personal' }),
    enabled: !authLoading && isAuthenticated,
  });

  if (authLoading) {
    return <LoadingSpinner variant="overlay" />;
  }

  // Real bug found and fixed: `analytics.totalForms` comes from GET /api/dashboard/analytics,
  // a separate backend aggregate that has the identical workspace-leak bug formsService.getForms()
  // was already fixed for (a brand-new user's "default workspace" — the one they just joined via
  // invite accept — bleeds into personal counts). That endpoint returns no per-form breakdown to
  // filter, but `formsData` (the already-filtered, already-fetched query right below) is ground
  // truth for "how many personal forms actually exist" — trust it exclusively, so the page can't
  // show "1 form" in the stat cards while "Your forms" and /forms both correctly say zero.
  //
  // Second bug found and fixed, same root cause: falling back to `analytics?.totalForms` while
  // `formsData` was still loading (this used to be `formsData ? ... : analytics?.totalForms`)
  // meant a page reload flashed the stat cards on — `analyticsLoading` flips false first,
  // typically before `formsData` resolves, and until this fix that gap read a stale/leaked
  // analytics count as if it were confirmed. Never claim "has forms" until the reliable query
  // has actually answered; no fallback, no interim guess.
  const formsLoaded = !!formsData;
  const hasForms = formsLoaded && formsData.total > 0;
  const effectiveCounts = analytics && {
    ...analytics,
    totalForms: formsLoaded ? formsData.total : analytics.totalForms,
    // Can't exceed the corrected total — caps the same leaked-form case without needing to know
    // exactly which of the (at most 5) previewed rows are published.
    publishedForms: formsLoaded ? Math.min(analytics.publishedForms, formsData.total) : analytics.publishedForms,
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Personal space"
        title={user?.name ? `Welcome back, ${user.name}` : 'Welcome back'}
        description="Your forms and activity, outside a workspace."
        actions={
          <Link href="/forms" className="bg-btn bg-btn-primary shrink-0">
            <Plus size={16} className="mr-2" />
            Create a form
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/forms" className="block">
          <Card className="flex flex-col gap-2 h-full transition-shadow hover:shadow-md">
            <PlusCircle size={24} className="text-text-muted" aria-hidden="true" />
            <strong className="text-body font-semibold text-text-primary">Create a form</strong>
            <span className="text-caption text-text-muted">Start from scratch</span>
          </Card>
        </Link>
        <Link href="/templates" className="block">
          <Card className="flex flex-col gap-2 h-full transition-shadow hover:shadow-md">
            <LayoutTemplate size={24} className="text-text-muted" aria-hidden="true" />
            <strong className="text-body font-semibold text-text-primary">Browse templates</strong>
            <span className="text-caption text-text-muted">Start with a proven structure</span>
          </Card>
        </Link>
      </div>

      <div className="bg-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="bg-h2">Your forms</h2>
        <Link href="/forms" className="bg-btn bg-btn-secondary bg-btn-sm">
          View all
        </Link>
      </div>

      {/* Gated on formsLoaded (not analyticsLoading) — showing this as a loading skeleton
          before we know hasForms is what caused the reported flash: cards appear on every
          reload, then vanish a moment later once the real (zero-forms) answer lands. Waiting
          for the one query this page actually trusts means the cards simply don't render at
          all for a zero-forms account, instead of rendering wrong and then correcting. */}
      {formsLoaded && hasForms && (
        <StatisticsCards isLoading={analyticsLoading} counts={effectiveCounts} />
      )}

      {formsLoading ? (
        <Card className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="text" width="100%" height={20} />
          ))}
        </Card>
      ) : (!formsData?.forms || formsData.forms.length === 0) ? (
        <EmptyState
          icon={<FileText className="bg-icon" aria-hidden="true" />}
          title="Create your first form"
          description="Your standalone forms will show up here once you create one."
          actions={
            <Link href="/forms" className="bg-btn bg-btn-primary">
              Create a form
            </Link>
          }
        />
      ) : (
        <Card padded={false}>
          {(formsData?.forms ?? []).map((form, i) => (
            <div
              key={form._id}
              className="flex items-center justify-between gap-4 px-4 py-3"
              style={i !== (formsData?.forms?.length ?? 0) - 1 ? { borderBottom: '1px solid var(--border-default)' } : undefined}
            >
              <Link href={`/forms/${form._id}/edit`} className="min-w-0 flex-1">
                <p className="text-body-sm font-semibold text-text-primary truncate">{form.title}</p>
                <p className="text-caption text-text-muted">
                  {STATUS_LABEL[form.status]} · {form.responseCount} response{form.responseCount !== 1 ? 's' : ''}
                </p>
              </Link>
              <StatusBadge variant={STATUS_VARIANT[form.status]}>{STATUS_LABEL[form.status]}</StatusBadge>
            </div>
          ))}
        </Card>
      )}

      {formsLoaded && hasForms && (
        <RecentActivitySection
          hasForms={hasForms}
          activities={analytics?.recentActivity}
          isLoading={analyticsLoading}
          isError={isError}
          onRetry={() => void refetch()}
        />
      )}
    </div>
  );
}
