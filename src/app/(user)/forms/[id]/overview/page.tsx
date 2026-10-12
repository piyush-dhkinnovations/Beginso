'use client';

import { buildPublicFormUrl, publicFormSlug } from '@/lib/publicFormUrl';
import { useContext, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Copy, Lock, FileQuestion, Link2, Inbox, Share2 } from 'lucide-react';
import { AuthContext } from '@/lib/authContext';
import { formsService } from '@/services/forms';
import { formAccessService } from '@/services/formAccess';
import { eventsService } from '@/services/events';
import { responsesService } from '@/services/responses';
import { analyticsService } from '@/services/analytics';
import { workspacesService } from '@/services/workspaces';
import { formKeys, formAccessKeys, formEventKeys, responseKeys, workspaceKeys, analyticsKeys } from '@/lib/queryKeys';
import { hasCapability } from '@/lib/roles';
import { formatRelativeTime } from '@/lib/formatters';
import { useToast } from '@/components/ui/Toast';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormOverviewStats } from '@/components/forms/FormOverviewStats';
import { FormDetailsCard } from '@/components/forms/FormDetailsCard';
import { FormActivityCard, FORM_ACTIVITY_FETCH_COUNT } from '@/components/forms/FormActivityCard';
import { FormActivityDrawer } from '@/components/forms/FormActivityDrawer';
import { FormAccessPanel } from '@/components/team/FormAccessPanel';
import type { IResponse } from '@/types/response';

const RECENT_RESPONSES = 5;


function firstAnswer(response: IResponse): string {
  const value = Object.values(response.answers)[0];
  if (Array.isArray(value)) return value.join(', ');
  return value === null || value === undefined || value === '' ? '—' : String(value);
}

// requirements.md §7.2–7.5 / design.md §5. One flat route for personal and workspace forms alike
// (design.md §4) — only the breadcrumb differs. No form-level sidebar this sprint (§3): the
// breadcrumb plus the header/card links are the only cross-navigation.
export default function FormOverviewPage() {
  const { id: formId } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [isAccessOpen, setIsAccessOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const currentUser = useContext(AuthContext)?.user;

  const overviewQuery = useQuery({
    queryKey: formKeys.overview(formId),
    queryFn: () => formsService.getFormOverview(formId),
  });
  const form = overviewQuery.data?.form;
  const stats = overviewQuery.data?.stats;

  // Same key FormAccessPanel reads, so opening the panel from this page is a cache hit (design.md §5).
  const grantsQuery = useQuery({
    queryKey: formAccessKeys.grants(formId),
    queryFn: () => formAccessService.listGrants(formId),
  });

  // One row over the preview count, so the card can tell "View all" is warranted (FormActivityCard).
  const eventsQuery = useQuery({
    queryKey: formEventKeys.list(formId, 1, FORM_ACTIVITY_FETCH_COUNT),
    queryFn: () => eventsService.listFormEvents(formId, 1, FORM_ACTIVITY_FETCH_COUNT),
  });

  // Real bug found and fixed: `stats.responseCount` comes from GET /api/forms/:id's own
  // `responseCount` field (getFormOverview's fallback chain), which the backend does not keep in
  // sync with the actual Response collection — the "Recent responses" card right next to it
  // queries /api/responses directly and shows the true count. Same reasoning responsesService.ts's
  // own getStats() already documents for the identical field: don't trust a denormalized count,
  // derive it from the real list endpoint's `total` instead. Overrides `stats.responseCount` with
  // it wherever it's loaded so the two cards on this page can never disagree.
  const workspaceId = form?.workspaceId ?? null;
  const workspacesQuery = useQuery({
    queryKey: workspaceKeys.list(),
    queryFn: workspacesService.list,
    enabled: workspaceId !== null,
  });
  const workspace = workspacesQuery.data?.find((w) => w.id === workspaceId);

  // Workspace forms must be queried under their own slug; undefined until it resolves.
  const scope = !form ? undefined : workspaceId === null ? 'personal' : workspace?.slug;
  const responsesQuery = useQuery({
    queryKey: responseKeys.list(scope ?? 'pending', formId, { limit: RECENT_RESPONSES }),
    queryFn: () => responsesService.getResponses({ formId, limit: RECENT_RESPONSES }, scope),
    enabled: !!scope,
  });
  const responseCount = responsesQuery.data?.total;

  // Real view count (nullable — the backend may not track views); the Views KPI is omitted when null.
  const viewsQuery = useQuery({
    queryKey: analyticsKeys.overview(formId, {}),
    queryFn: () => analyticsService.getOverview({ formId }, scope),
    enabled: !!scope,
  });

  if (overviewQuery.isLoading) {
    return (
      <div className="flex flex-col gap-4" aria-label="Loading form overview">
        <Skeleton variant="title" width="40%" />
        <Skeleton variant="text" width="100%" height={96} />
      </div>
    );
  }

  if (overviewQuery.isError || !form || !stats) {
    const status = (overviewQuery.error as { response?: { status?: number } } | null)?.response?.status;
    if (status === 403) {
      return <EmptyState illustration="no-access" icon={<Lock className="bg-icon" aria-hidden="true" />} title="You do not have access to this form." />;
    }
    if (status === 404) {
      return <EmptyState illustration="not-found" icon={<FileQuestion className="bg-icon" aria-hidden="true" />} title="This form could not be found." />;
    }
    return (
      <Alert variant="error" title="We could not load this form.">
        <Button variant="secondary" size="small" onClick={() => void overviewQuery.refetch()}>
          Retry
        </Button>
      </Alert>
    );
  }

  const effectiveStats = { ...stats, responseCount: responseCount ?? stats.responseCount };

  // Personal form: the caller owns it. Workspace form: their membership role, fail-closed while
  // unknown — Reviewer (or an unresolved role) sees Preview only (requirements.md §7.2). A
  // convenience only; the server enforces every one of these (CLAUDE.md).
  const role = form.myRole ?? (workspaceId === null ? 'owner' : workspace?.role);
  const canEdit = role !== undefined && hasCapability(role, 'forms:edit');

  const grantCount = grantsQuery.data?.length;
  const accessLabel =
    grantCount === undefined
      ? grantsQuery.isError ? '—' : '…'
      : workspaceId === null
        ? grantCount === 0 ? 'Just you' : `${grantCount} ${grantCount === 1 ? 'person' : 'people'}`
        : // Backend contract to confirm whether the count distinguishes role-covered members from
          // explicit grants (requirements.md §7.4) — until then, don't assert a false precise count.
          grantCount === 0 ? 'Workspace team' : `Workspace team + ${grantCount} other${grantCount === 1 ? '' : 's'}`;

  // Real bug found and fixed: this only checked `form.slug` truthy, so a never-published draft
  // (which already has a slug reserved at creation, per the backend) showed a live-looking,
  // copyable public URL here — while the builder's own Share tab, for the exact same form,
  // correctly says "Publish your form first to get a shareable link." Gated on status too, so
  // the two surfaces agree.
  const publicUrl =
    form.status === 'published' ? buildPublicFormUrl(publicFormSlug(form)) : '';
  const editHref = workspace?.slug ? `/forms/${formId}/edit?ws=${workspace.slug}` : `/forms/${formId}/edit`;
  const inboxHref = workspace?.slug ? `/forms/${formId}/inbox?ws=${workspace.slug}` : `/forms/${formId}/inbox`;

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <h1 className="sr-only">Overview</h1>
      <FormOverviewStats
        stats={effectiveStats}
        accessLabel={accessLabel}
        onOpenAccess={() => setIsAccessOpen(true)}
        views={viewsQuery.data?.views}
      />

      {publicUrl ? (
        <Card className="flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-8">
          {/* Left: what this is. Right: the link itself, as wide as the space allows so the whole URL is readable. */}
          <div className="flex flex-none items-center gap-3">
            <span className="inline-flex size-12 flex-none items-center justify-center rounded-xl bg-(--surface-hover) text-(--action-primary)">
              <Link2 className="size-6" aria-hidden="true" />
            </span>
            <h2 className="bg-h4">Share link</h2>
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-2 md:max-w-3xl">
            <div className="min-w-0 flex-1">
              <Input
                id="overview-public-url"
                aria-label="Public link"
                value={publicUrl}
                readOnly
                title={publicUrl}
                leftIcon={<Link2 size={16} aria-hidden="true" />}
                className="w-full font-mono"
                onFocus={(e) => e.currentTarget.select()}
              />
            </div>
            <Button
              variant="secondary"
              aria-label="Copy link"
              className="flex-none"
              onClick={() => {
                void navigator.clipboard.writeText(publicUrl);
                toast('Link copied to clipboard.', 'success');
              }}
            >
              <Copy size={16} aria-hidden="true" />
            </Button>
          </div>
        </Card>
      ) : (
        // Draft / closed: the one next step, in the page's most prominent spot.
        <section
          aria-labelledby="publish-banner-heading"
          className="flex flex-col gap-4 rounded-xl border border-(--warning-border,var(--border-default)) bg-(--warning-bg,var(--surface-hover)) p-5 md:flex-row md:items-center"
        >
          <span className="inline-flex size-12 flex-none items-center justify-center rounded-xl bg-(--surface-card) text-(--action-primary)">
            <Link2 className="size-6" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="publish-banner-heading" className="bg-h4">Publish your form</h2>
            <p className="bg-body-sm m-0 text-(--text-secondary)">
              {form.status === 'closed'
                ? 'This form is closed and no longer accepts responses. Re-publish it to start collecting again.'
                : 'Your form is still a draft and does not have a public link. Publish it to start collecting responses.'}
            </p>
          </div>
          {canEdit && (
            <ButtonLink variant="primary" href={editHref} className="flex-none self-start md:self-center">
              {form.status === 'closed' ? 'Re-publish form' : 'Publish form'}
            </ButtonLink>
          )}
        </section>
      )}

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          {/* No "Response sources" card: the backend records no referrer/channel per response. */}
          <section aria-labelledby="recent-responses-heading" className="flex flex-col gap-3 rounded-xl border border-(--border-default) bg-(--surface-card) p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="recent-responses-heading" className="bg-h4">Recent responses</h2>
              <span className="flex items-center gap-3">
                {/* Sprint 12 (inbox-collaboration), task 5.2 — placement judgment call, no wireframe
                    names a surface for this (see ScoreComparison's own comment). */}
                <Link href={`/forms/${formId}/scores`} className="bg-body-sm">
                  Score comparison
                </Link>
                <ButtonLink variant="ghost" size="small" href={inboxHref}>
                  View all responses →
                </ButtonLink>
              </span>
            </div>
            {responsesQuery.isLoading ? (
              <Skeleton variant="text" width="100%" height={64} />
            ) : responsesQuery.isError ? (
              <Alert variant="error" title="Could not load responses." />
            ) : !responsesQuery.data || responsesQuery.data.data.length === 0 ? (
              <div className="flex flex-col items-center gap-3">
                <EmptyState
                  icon={<Inbox className="bg-icon" aria-hidden="true" />}
                  title="No responses yet"
                  description="Once someone submits this form, their responses will appear here."
                />
                {canEdit && (
                  <Button variant="secondary" onClick={() => setIsAccessOpen(true)}>
                    <Share2 size={16} className="mr-1.5" aria-hidden="true" />
                    Share form
                  </Button>
                )}
              </div>
            ) : (
              <ul className="m-0 flex list-none flex-col p-0">
                {responsesQuery.data.data.map((response) => (
                  <li key={response._id} className="flex items-baseline justify-between gap-3 border-b border-(--border-subtle) py-2">
                    <span className="bg-body-sm truncate">{firstAnswer(response)}</span>
                    <time className="bg-caption shrink-0" dateTime={response.submittedAt}>
                      {formatRelativeTime(response.submittedAt)}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <FormDetailsCard
          form={form}
          createdBy={form.owner?.name ?? (workspaceId === null ? currentUser?.name : undefined)}
          editHref={canEdit ? editHref : undefined}
        />
      </div>

      <FormActivityCard
        events={eventsQuery.data}
        isLoading={eventsQuery.isLoading}
        isError={eventsQuery.isError}
        onRetry={() => void eventsQuery.refetch()}
        onViewAll={() => setIsActivityOpen(true)}
      />

      <FormActivityDrawer formId={formId} isOpen={isActivityOpen} onClose={() => setIsActivityOpen(false)} />

      {/* Opened from the "Who can see it" card; the shared header's Share button has its own instance. */}
      <FormAccessPanel formId={formId} formTitle={form.title} isOpen={isAccessOpen} onClose={() => setIsAccessOpen(false)} />
    </div>
  );
}
