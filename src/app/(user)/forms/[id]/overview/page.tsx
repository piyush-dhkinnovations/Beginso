'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Copy, Lock, FileQuestion, Share2 } from 'lucide-react';
import { formsService } from '@/services/forms';
import { formAccessService } from '@/services/formAccess';
import { eventsService } from '@/services/events';
import { responsesService } from '@/services/responses';
import { workspacesService } from '@/services/workspaces';
import { formKeys, formAccessKeys, formEventKeys, responseKeys, workspaceKeys } from '@/lib/queryKeys';
import { hasCapability } from '@/lib/roles';
import { formatRelativeTime } from '@/lib/formatters';
import { useToast } from '@/components/common/Toast';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { FormOverviewStats } from '@/components/forms/FormOverviewStats';
import { FormActivityCard, FORM_ACTIVITY_PREVIEW_COUNT } from '@/components/forms/FormActivityCard';
import { FormActivityDrawer } from '@/components/forms/FormActivityDrawer';
import { FormAccessPanel } from '@/components/team/FormAccessPanel';
import type { IResponse } from '@/types/response';
import type { BreadcrumbItem } from '@/components/ui/Breadcrumb';

const RECENT_RESPONSES = 5;

const STATUS_LABEL = { draft: 'Draft', published: 'Published', closed: 'Closed' } as const;

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
    queryKey: formEventKeys.list(formId, 1, FORM_ACTIVITY_PREVIEW_COUNT + 1),
    queryFn: () => eventsService.listFormEvents(formId, 1, FORM_ACTIVITY_PREVIEW_COUNT + 1),
  });

  const responsesQuery = useQuery({
    queryKey: responseKeys.list('personal', formId, { limit: RECENT_RESPONSES }),
    queryFn: () => responsesService.getResponses({ formId, limit: RECENT_RESPONSES }),
  });

  // Real bug found and fixed: `stats.responseCount` comes from GET /api/forms/:id's own
  // `responseCount` field (getFormOverview's fallback chain), which the backend does not keep in
  // sync with the actual Response collection — the "Recent responses" card right next to it
  // queries /api/responses directly and shows the true count. Same reasoning responsesService.ts's
  // own getStats() already documents for the identical field: don't trust a denormalized count,
  // derive it from the real list endpoint's `total` instead. Overrides `stats.responseCount` with
  // it wherever it's loaded so the two cards on this page can never disagree.
  const responseCount = responsesQuery.data?.total;

  const workspaceId = form?.workspaceId ?? null;
  const workspacesQuery = useQuery({
    queryKey: workspaceKeys.list(),
    queryFn: workspacesService.list,
    enabled: workspaceId !== null,
  });
  const workspace = workspacesQuery.data?.find((w) => w.id === workspaceId);

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
      return <EmptyState icon={<Lock className="bg-icon" aria-hidden="true" />} title="You do not have access to this form." />;
    }
    if (status === 404) {
      return <EmptyState icon={<FileQuestion className="bg-icon" aria-hidden="true" />} title="This form could not be found." />;
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

  // Owner-type breadcrumb (requirements.md §7.2). A form reached only through a per-form grant has
  // no matching workspace membership to name, so it falls back to Shared with me.
  const breadcrumb: BreadcrumbItem[] =
    workspaceId === null
      ? [{ label: 'My Forms', href: '/forms' }, { label: form.title }]
      : workspace
        ? [
            { label: workspace.name, href: `/w/${workspace.slug}` },
            { label: 'Forms', href: `/w/${workspace.slug}/forms` },
            { label: form.title },
          ]
        : [{ label: 'Shared with me', href: '/shared' }, { label: form.title }];

  // Personal form: the caller owns it. Workspace form: their membership role, fail-closed while
  // unknown — Reviewer (or an unresolved role) sees Preview only (requirements.md §7.2). A
  // convenience only; the server enforces every one of these (CLAUDE.md).
  const role = workspaceId === null ? 'owner' : workspace?.role;
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
    form.slug && form.status === 'published' ? `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/f/${form.slug}` : '';

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <PageHeader
        breadcrumb={breadcrumb}
        eyebrow="Form overview"
        title={form.title}
        description={
          <span className="inline-flex items-center gap-2">
            <StatusBadge variant={form.status}>{STATUS_LABEL[form.status]}</StatusBadge>
            {effectiveStats.responseCount} response{effectiveStats.responseCount === 1 ? '' : 's'}
          </span>
        }
        actions={
          <>
            <Link href={`/forms/${formId}/preview`}>
              <Button variant="secondary">Preview</Button>
            </Link>
            {canEdit && (
              <Button variant="secondary" onClick={() => setIsAccessOpen(true)}>
                <Share2 size={16} className="mr-2" aria-hidden="true" />
                Share
              </Button>
            )}
            {canEdit && (
              <Link href={workspace?.slug ? `/forms/${formId}/edit?ws=${workspace.slug}` : `/forms/${formId}/edit`}>
                <Button variant="primary">Edit form</Button>
              </Link>
            )}
          </>
        }
      />

      <FormOverviewStats stats={effectiveStats} accessLabel={accessLabel} onOpenAccess={() => setIsAccessOpen(true)} />

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        <Card className="flex flex-col gap-3">
          <h2 className="bg-h4">Share link</h2>
          {publicUrl ? (
            <div className="flex items-center gap-2">
              <Input
                id="overview-public-url"
                aria-label="Public link"
                value={publicUrl}
                readOnly
                title={publicUrl}
                className="font-mono"
                style={{ textOverflow: 'ellipsis' }}
                onFocus={(e) => e.currentTarget.select()}
              />
              <Button
                variant="secondary"
                aria-label="Copy link"
                onClick={() => {
                  void navigator.clipboard.writeText(publicUrl);
                  toast('Link copied to clipboard.', 'success');
                }}
              >
                <Copy size={16} aria-hidden="true" />
              </Button>
            </div>
          ) : (
            <p className="bg-body-sm" style={{ color: 'var(--text-muted)', margin: 0 }}>
              This form is not published yet, so there is no public link.
            </p>
          )}
        </Card>

        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="bg-h4">Recent responses</h2>
            <span className="flex items-center gap-3">
              {/* Sprint 12 (inbox-collaboration), task 5.2 — placement judgment call, no wireframe
                  names a surface for this (see ScoreComparison's own comment). */}
              <Link href={`/forms/${formId}/scores`} className="bg-body-sm">
                Score comparison
              </Link>
              <Link href={workspace?.slug ? `/forms/${formId}/responses?ws=${workspace.slug}` : `/forms/${formId}/responses`} className="bg-body-sm">
                View inbox
              </Link>
            </span>
          </div>
          {responsesQuery.isLoading ? (
            <Skeleton variant="text" width="100%" height={64} />
          ) : responsesQuery.isError ? (
            <Alert variant="error" title="Could not load responses." />
          ) : !responsesQuery.data || responsesQuery.data.data.length === 0 ? (
            <p className="bg-body-sm" style={{ color: 'var(--text-muted)', margin: 0 }}>
              No responses yet.
            </p>
          ) : (
            <ul className="flex flex-col" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {responsesQuery.data.data.map((response) => (
                <li
                  key={response._id}
                  className="flex items-baseline justify-between gap-3 py-2"
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}
                >
                  <span className="bg-body-sm truncate">{firstAnswer(response)}</span>
                  <time className="bg-caption shrink-0" dateTime={response.submittedAt}>
                    {formatRelativeTime(response.submittedAt)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <FormActivityCard
        events={eventsQuery.data}
        isLoading={eventsQuery.isLoading}
        isError={eventsQuery.isError}
        onRetry={() => void eventsQuery.refetch()}
        onViewAll={() => setIsActivityOpen(true)}
      />

      <FormActivityDrawer formId={formId} isOpen={isActivityOpen} onClose={() => setIsActivityOpen(false)} />

      <FormAccessPanel formId={formId} formTitle={form.title} isOpen={isAccessOpen} onClose={() => setIsAccessOpen(false)} />
    </div>
  );
}
