'use client';

// Wireframe Screen 06: Workspace Home (requirements.md §7.6, design.md §15.2 & §17).
// Note: Role-differentiated content (e.g. Owner/Admin vs Reviewer views per B2.1-B2.3)
// is explicitly Sprint 9 scope — see tasks.md Phase 4 task 4.2.
//
// Sprint 8 scope: loading skeleton, empty state, error card, and the populated two-column
// dashboard split (stat cards + quick actions + pinned forms / recent activity).
// Real data wiring (actual form list per workspace) is done via the existing workspaceKeys.forms
// query key factory, scoped to this workspace context.

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { FormsOverviewCharts } from '@/components/analytics/FormsOverviewCharts';
import { FileText, Files, MessageSquare, Plus, LayoutTemplate, FilePlus, Table, Settings, Download, Clock, BarChart2, Edit3, Share2 } from 'lucide-react';
import { formsService } from '@/services/forms';
import { eventsService } from '@/services/events';
import { activityKeys, workspaceKeys } from '@/lib/queryKeys';
import { useWorkspaceRole } from '@/hooks/useWorkspaceRole';
import { canManageWorkspaceSettings } from '@/lib/roles';
import { ActivityFeed } from '@/components/workspaces/ActivityFeed';
import { PageHeader, Button, EmptyState, StatCard, Card, Badge, Skeleton } from '@/components/ui';
import { FormAccessPanel } from '@/components/team/FormAccessPanel';
import type { Form } from '@/types/form';

// Workspace Home page — client component so loading/error/empty/populated states are all
// rendered from a real query rather than hardcoded on the server.
export default function WorkspaceHomePage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const context = { type: 'workspace' as const, workspaceId: slug };
  const [formToShare, setFormToShare] = useState<Form | null>(null);
  const role = useWorkspaceRole(slug);

  // Same feed as /w/[slug]/activity, first five events.
  const activity = useQuery({
    queryKey: [...activityKeys.all(slug), 'recent', 5],
    queryFn: () => eventsService.listWorkspaceActivity(slug, 1, 5),
    retry: false,
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...workspaceKeys.forms(context), 'all'],
    // Real bug found and fixed: context was computed above but never actually passed to
    // getForms(), so this page's "your forms" list silently showed every form the caller can
    // see across every context, not just this workspace's (src/services/forms.ts's own comment
    // has the full root-cause — requirePermission()'s workspace resolution falls back to the
    // caller's default workspace when nothing in the request says otherwise).
    queryFn: () => formsService.getAllForms(context),
    staleTime: 60_000,
  });

  const forms = data?.forms ?? [];
  const isEmpty = !isLoading && !error && forms.length === 0;

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 w-full">
        <div className="flex flex-col gap-1">
          <Skeleton variant="title" width="40%" />
          <Skeleton variant="text" width="60%" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="flex flex-col gap-2">
              <Skeleton variant="text" width="50%" />
              <Skeleton variant="title" width="30%" />
            </Card>
          ))}
        </div>
        <Card className="flex flex-col gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 py-2 border-b border-(--border-default) last:border-0">
              <Skeleton variant="circle" width="36px" height="36px" />
              <div className="flex flex-col gap-1.5 flex-1">
                <Skeleton variant="text" width="45%" />
                <Skeleton variant="text" width="30%" />
              </div>
              <Skeleton variant="text" width="60px" />
            </div>
          ))}
        </Card>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col gap-4 w-full">
        <PageHeader
          title="Home"
        />
        <Card role="alert" className="flex items-center justify-between gap-4">
          <div>
            <p className="bg-body-sm font-semibold text-(--text-primary)">Unable to load workspace data</p>
            <p className="mt-1 bg-caption text-(--text-muted)">Please try again.</p>
          </div>
          <Button variant="secondary" size="small" onClick={() => void refetch()}>
            Try again
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      <PageHeader
        title="Home"
        actions={
          <div className="flex items-center gap-2.5">
            <Link href={`/w/${slug}/forms`}>
              <Button variant="primary">
                <Plus size={16} className="mr-1.5" />
                New Form
              </Button>
            </Link>
            <Link href={`/w/${slug}/templates`}>
              <Button variant="secondary">
                <LayoutTemplate size={16} className="mr-1.5" />
                Templates
              </Button>
            </Link>
          </div>
        }
      />

      {isEmpty ? (
        // ── Empty state (B2.4 — just-created workspace) ──────────────────────
        <EmptyState illustration="onboarding"
          icon={<FilePlus className="bg-icon text-(--text-muted)" size={32} aria-hidden="true" />}
          title="Welcome to your workspace!"
          description="Create your first interactive web form or start from one of our professional, pre-built templates to get started."
          primaryAction={
            <Link href={`/w/${slug}/forms`}>
              <Button variant="primary">Create Form</Button>
            </Link>
          }
          secondaryAction={
            <Link href={`/w/${slug}/templates`}>
              <Button variant="secondary">Browse Templates</Button>
            </Link>
          }
        />
      ) : (
        // ── Populated state (Screen 06) ────────────────────────────────────
        <div className="flex flex-col gap-5">
          {/* Stat cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="Total Forms" value={data?.total ?? forms.length} icon={<FileText aria-hidden="true" />} />
            <StatCard
              label="Total Responses"
              value={forms.reduce((s, f) => s + (f.responseCount ?? 0), 0)}
              icon={<MessageSquare aria-hidden="true" />}
            />
            <StatCard
              label="Active Forms"
              value={forms.filter((f) => f.status === 'published').length}
              unit={forms.length > 0 ? `/ ${forms.length}` : undefined}
              icon={<Files aria-hidden="true" />}
              chart={
                forms.length > 0
                  ? { kind: 'ring', percent: Math.round((forms.filter((f) => f.status === 'published').length / forms.length) * 100) }
                  : undefined
              }
            />
          </div>

          <FormsOverviewCharts
            insightsHref={`/w/${slug}/insights`}
            forms={forms.map((f) => ({ title: f.title, status: f.status, responses: f.responseCount ?? 0 }))}
          />

          {/* Quick actions strip */}
          <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
            <span className="bg-body-sm font-semibold text-(--text-primary)">Quick Actions</span>
            <div className="flex flex-wrap gap-2">
              <Link href={`/w/${slug}/inbox`}>
                <Button variant="secondary" size="small">
                  <Table size={13} className="mr-1.5" />
                  Open Inbox
                </Button>
              </Link>
              {canManageWorkspaceSettings(role) && (
                <Link href={`/w/${slug}/settings?tab=branding`}>
                  <Button variant="secondary" size="small">
                    <Settings size={13} className="mr-1.5" />
                    Branding
                  </Button>
                </Link>
              )}
              <Link href={`/w/${slug}/exports`}>
                <Button variant="secondary" size="small">
                  <Download size={13} className="mr-1.5" />
                  Exports
                </Button>
              </Link>
            </div>
          </Card>

          {/* Two-column: Recent forms (left) + Recent Activity (right). Not "Pinned": pinning a workspace form does not persist yet, so this is the most recent five. */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card className="flex flex-col gap-4">
              <div className="flex items-center gap-2 pb-2 border-b border-(--border-default)">
                <Clock size={14} className="text-(--text-muted)" />
                <h3 className="bg-body font-semibold text-(--text-primary)">Recent forms</h3>
              </div>
              <div className="flex flex-col gap-3">
                {forms.slice(0, 5).map((f) => (
                  <div key={f._id} className="flex flex-col gap-1.5 pb-3 border-b border-(--border-default) last:border-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="bg-body-sm font-semibold text-(--text-primary)">{f.title}</span>
                      <Badge>{f.status === 'published' ? `Active · ${f.responseCount} responses` : 'Draft'}</Badge>
                    </div>
                    <div className="flex items-center gap-3 bg-caption text-(--text-muted)">
                      <Link href={`/forms/${f._id}/inbox?ws=${slug}`} className="hover:text-(--text-primary) flex items-center gap-1">
                        <Table size={12} /> Inbox
                      </Link>
                      <Link href={`/forms/${f._id}/insights?ws=${slug}`} className="hover:text-(--text-primary) flex items-center gap-1">
                        <BarChart2 size={12} /> Insights
                      </Link>
                      <Link href={`/forms/${f._id}/edit?ws=${slug}`} className="hover:text-(--text-primary) flex items-center gap-1">
                        <Edit3 size={12} /> Edit
                      </Link>
                      {/* Real bug found and fixed: this linked to /w/[slug]/share, a route that
                          doesn't exist (and dropped the form's own id, unlike every sibling link
                          here) — a dead link, always 404. Sprint 9 already built the real
                          destination for "share this form" (FormAccessPanel); reused instead of
                          building a new route. */}
                      <button
                        type="button"
                        onClick={() => setFormToShare(f)}
                        className="hover:text-(--text-primary) flex items-center gap-1"
                      >
                        <Share2 size={12} /> Share
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="flex flex-col gap-4">
              <div className="pb-2 border-b border-(--border-default)">
                <h3 className="bg-body font-semibold text-(--text-primary)">Recent Activity</h3>
              </div>
              {activity.isLoading ? (
                <Skeleton variant="text" width="100%" height={44} />
              ) : activity.isError ? (
                <p className="bg-caption text-(--text-muted)">Recent activity could not be loaded.</p>
              ) : (
                <>
                  <ActivityFeed events={activity.data ?? []} />
                  {(activity.data?.length ?? 0) > 0 && (
                    <Link href={`/w/${slug}/activity`} className="bg-body-sm font-semibold text-(--action-primary) hover:underline">
                      View all activity
                    </Link>
                  )}
                </>
              )}
            </Card>
          </div>
        </div>
      )}

      <FormAccessPanel
        isOpen={formToShare !== null}
        formId={formToShare?._id ?? ''}
        formTitle={formToShare?.title ?? ''}
        onClose={() => setFormToShare(null)}
      />
    </div>
  );
}
