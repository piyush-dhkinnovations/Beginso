'use client';

import Link from 'next/link';
import { Plus, LayoutTemplate, PlusCircle, FileText } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { dashboardService } from '@/services/dashboard';
import { formsService } from '@/services/forms';
import { useResponseTrend } from '@/hooks/useResponseTrend';
import { dashboardKeys, workspaceKeys } from '@/lib/queryKeys';
import { formatRelativeTime } from '@/lib/formatters';
import { WELCOME_DESCRIPTION, welcomeTitle } from '@/lib/welcome';
import { useCustomDashboard } from '@/components/dashboard-grid/CustomDashboard';
import { personalDefaults, personalMetrics } from '@/components/dashboard-grid/personalHome';
import { RecentActivitySection } from '@/components/dashboard/RecentActivitySection';
import { ButtonLink } from '@/components/ui';
import { ActionCard, Card, EmptyState, PageHeader, StatusBadge } from '@/components/ui';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { HomeBodySkeleton } from '@/components/ui/PageSkeletons';
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

const YOUR_FORMS_LIMIT = 10; // fetched; the list shows the first YOUR_FORMS_SHOWN
const YOUR_FORMS_SHOWN = 5;

const HOW_IT_WORKS = [
  { title: 'Build', body: 'Add questions in the builder, or start from a template.' },
  { title: 'Share', body: 'Publish and send the link to anyone — no account needed.' },
  { title: 'Collect', body: 'Responses land in your inbox, ready to review and export.' },
];

// Personal Home (A1.4). First run (no personal forms) is one illustrated call to action plus a
// three-step "how it works" strip — not a wall of zeros. Once forms exist: the stat cards lead
// (split graphs where the data supports one), then two columns — "Your forms" on the left, quick
// actions and recent activity on the right. All cards share the Tinted surface (.bg-card).
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

  const { data: formsData, isLoading: formsLoading, isError: formsError, refetch: refetchForms } = useQuery({
    queryKey: workspaceKeys.forms({ type: 'personal' }, { page: 1, limit: YOUR_FORMS_LIMIT }),
    // Real bug found and fixed: never told the backend this was a personal-space request, so it
    // fell back to the caller's default workspace and showed workspace forms here too
    // (src/services/forms.ts's own comment has the full root-cause).
    queryFn: () => formsService.getForms({ page: 1, limit: YOUR_FORMS_LIMIT }, { type: 'personal' }),
    enabled: !authLoading && isAuthenticated,
  });

  // Daily responses for the last 30 days — the real series behind the Total Responses line
  // (see useResponseTrend: all-forms call first, per-form sum second, else no trend).
  const responseTrend = useResponseTrend(
    (formsData?.forms ?? []).map((f) => f._id),
    !authLoading && isAuthenticated && !!formsData,
  );

  const formsLoaded = !!formsData;
  const hasForms = formsLoaded && formsData.total > 0;
  const effectiveCounts = analytics && {
    ...analytics,
    totalForms: formsLoaded ? formsData.total : analytics.totalForms,
    // Can't exceed the corrected total — caps the same leaked-form case without needing to know
    // exactly which of the (at most 5) previewed rows are published.
    publishedForms: formsLoaded ? Math.min(analytics.publishedForms, formsData.total) : analytics.publishedForms,
  };

  const metrics = personalMetrics(effectiveCounts, responseTrend, formsData?.forms ?? [], analytics?.locations);

  // ONE loading state for the whole page: signing in, the forms list, and (when there are forms) the stats and the widget
  // layout. It is the same skeleton as the route's loading.tsx, so nothing is swapped for a different one on the way.
  const dashboardEnabled = !authLoading && isAuthenticated && !analyticsLoading;
  const dashboard = useCustomDashboard({
    scope: 'personal',
    defaults: personalDefaults(metrics),
    metrics,
    enabled: dashboardEnabled,
  });
  const homeLoading = authLoading || formsLoading || (hasForms && (analyticsLoading || dashboard.loading));

  // Real bug found and fixed: `analytics.totalForms` comes from GET /api/dashboard/analytics,
  // a separate backend aggregate that has the identical workspace-leak bug formsService.getForms()
  // was already fixed for (a brand-new user's "default workspace" — the one they just joined via
  // invite accept — bleeds into personal counts). That endpoint returns no per-form breakdown to
  // filter, but `formsData` (the already-filtered, already-fetched query right below) is ground
  // truth for "how many personal forms actually exist" — trust it exclusively, so the page can't
  // show "1 form" in the stat cards while "Your forms" and /forms both correctly say zero.
  //
  // Second bug found and fixed, same root cause: falling back to `analytics?.totalForms` while
  // `formsData` was still loading meant a page reload flashed the stat cards on — `analyticsLoading`
  // flips false first, typically before `formsData` resolves, and until this fix that gap read a
  // stale/leaked analytics count as if it were confirmed. Never claim "has forms" until the
  // reliable query has actually answered; no fallback, no interim guess.

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Personal space"
        title={welcomeTitle(user?.name)}
        description={WELCOME_DESCRIPTION}
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {hasForms && dashboard.toolbar}
            {!dashboard.editing && (
              <ButtonLink href="/forms/new" className="shrink-0">
                <Plus size={16} className="mr-2" />
                Create Form
              </ButtonLink>
            )}
          </div>
        }
      />

      {homeLoading ? (
        <HomeBodySkeleton />
      ) : formsError && !formsData ? (
        // A failed request is not "no forms": telling someone who has forms to create their first one is wrong.
        <Card className="items-center gap-4 py-6">
          <Alert variant="error" title="We couldn't load your forms">
            Something went wrong on our side. Your forms are safe.
          </Alert>
          <Button onClick={() => void refetchForms()}>Try again</Button>
        </Card>
      ) : !hasForms ? (
        <>
          <Card className="items-center py-6">
            <EmptyState
              illustration="onboarding"
              icon={<FileText className="bg-icon" aria-hidden="true" />}
              title="Create your first form"
              description="Build a form, share the link, and collect responses — all from one place."
              actions={
                <>
                  <ButtonLink href="/forms/new">
                    <Plus size={16} className="mr-2" />
                    Create Form
                  </ButtonLink>
                  <ButtonLink href="/templates" variant="secondary">
                    Browse templates
                  </ButtonLink>
                </>
              }
            />
          </Card>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {HOW_IT_WORKS.map((step, i) => (
              <Card key={step.title} className="gap-1">
                <span className="bg-caption font-semibold text-(--text-link)">Step {i + 1}</span>
                <h2 className="bg-body font-semibold text-(--text-primary)">{step.title}</h2>
                <p className="bg-body-sm text-(--text-muted)">{step.body}</p>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Gated on formsLoaded (not analyticsLoading) — rendering the cards before we know
              hasForms flashed them on every reload for a zero-forms account. */}
          {dashboard.body}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <section aria-labelledby="your-forms-heading" className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <h2 id="your-forms-heading" className="bg-h5 font-bold text-(--text-primary)">Your forms</h2>
                <ButtonLink href="/forms" variant="secondary" size="small">
                  View all
                </ButtonLink>
              </div>
              <Card padded={false} className="divide-y divide-(--border-subtle) overflow-hidden">
                {formsData.forms.slice(0, YOUR_FORMS_SHOWN).map((form) => (
                  <Link
                    key={form._id}
                    href={`/forms/${form._id}/edit`}
                    className="flex items-center gap-3 px-4 py-3 no-underline transition-colors hover:bg-(--surface-hover)"
                  >
                    <span aria-hidden="true" className="bg-stat-icon mb-0 h-7! w-7!">
                      <FileText />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate bg-body-sm font-semibold text-(--text-primary)">{form.title}</span>
                      <span className="block bg-caption text-(--text-muted)">
                        {form.responseCount} response{form.responseCount !== 1 ? 's' : ''} · Updated {formatRelativeTime(form.updatedAt)}
                      </span>
                    </span>
                    <StatusBadge variant={STATUS_VARIANT[form.status]}>{STATUS_LABEL[form.status]}</StatusBadge>
                  </Link>
                ))}
              </Card>
            </section>

            <div className="flex flex-col gap-6">
              <section aria-labelledby="quick-actions-heading" className="flex flex-col gap-3">
                <div className="flex min-h-8 items-center"><h2 id="quick-actions-heading" className="bg-h5 font-bold text-(--text-primary)">Quick actions</h2></div>
                <div className="flex flex-col gap-3">
                  <ActionCard href="/forms/new" title="Create Form" hint="Start from scratch" icon={<PlusCircle />} />
                  <ActionCard href="/templates" title="Browse templates" hint="Start with a proven structure" icon={<LayoutTemplate />} />
                </div>
              </section>

              <RecentActivitySection
                hasForms={hasForms}
                activities={analytics?.recentActivity}
                isLoading={analyticsLoading}
                isError={isError}
                onRetry={() => void refetch()}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
