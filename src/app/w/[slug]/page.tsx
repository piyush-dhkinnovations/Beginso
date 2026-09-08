'use client';

// Wireframe Screen 06: Workspace Home (requirements.md §7.6, design.md §15.2 & §17).
// Note: Role-differentiated content (e.g. Owner/Admin vs Reviewer views per B2.1-B2.3)
// is explicitly Sprint 9 scope — see tasks.md Phase 4 task 4.2.
//
// Sprint 8 scope: loading skeleton, empty state, error card, and the populated two-column
// dashboard split (stat cards + quick actions + pinned forms / recent activity).
// Real data wiring (actual form list per workspace) is done via the existing workspaceKeys.forms
// query key factory, scoped to this workspace context.

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Plus, LayoutTemplate, FilePlus, Table, Settings, Download, Pin, BarChart2, Edit3, Share2 } from 'lucide-react';
import { formsService } from '@/services/forms';
import { workspaceKeys } from '@/lib/queryKeys';
import { PageHeader, Button, EmptyState, StatCard, Card, Badge, Skeleton } from '@/components/ui';

// Workspace Home page — client component so loading/error/empty/populated states are all
// rendered from a real query rather than hardcoded on the server.
export default function WorkspaceHomePage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const context = { type: 'workspace' as const, workspaceId: slug };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: workspaceKeys.forms(context, { limit: 20 }),
    queryFn: () => formsService.getForms({ limit: 20 }),
  });

  const forms = data?.forms ?? [];
  const isEmpty = !isLoading && !error && forms.length === 0;

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 max-w-6xl w-full mx-auto">
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
            <div key={i} className="flex items-center gap-3 py-2 border-b border-neutral-100 last:border-0">
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
      <div className="flex flex-col gap-6 max-w-6xl w-full mx-auto">
        <PageHeader
          title="Workspace Home"
          description="Create forms, track submissions, and check workspace activity."
        />
        <Card role="alert" className="flex items-center justify-between gap-4">
          <div>
            <p className="text-body-sm font-semibold text-neutral-800">Unable to load workspace data</p>
            <p className="mt-1 text-caption text-neutral-500">Please try again.</p>
          </div>
          <Button variant="secondary" size="small" onClick={() => void refetch()}>
            Try again
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl w-full mx-auto">
      <PageHeader
        title="Workspace Home"
        description="Create forms, track submissions, and check workspace activity."
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
        <EmptyState
          icon={<FilePlus className="bg-icon text-neutral-400" size={32} aria-hidden="true" />}
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
            <StatCard label="Total Forms" value={forms.length} />
            <StatCard label="Total Responses" value={forms.reduce((s, f) => s + (f.responseCount ?? 0), 0)} />
            <StatCard label="Active Forms" value={forms.filter((f) => f.status === 'published').length} />
          </div>

          {/* Quick actions strip */}
          <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
            <span className="text-body-sm font-semibold text-neutral-700">Quick Actions</span>
            <div className="flex flex-wrap gap-2">
              <Link href={`/w/${slug}/responses`}>
                <Button variant="secondary" size="small">
                  <Table size={13} className="mr-1.5" />
                  View Tables
                </Button>
              </Link>
              <Link href={`/w/${slug}/settings`}>
                <Button variant="secondary" size="small">
                  <Settings size={13} className="mr-1.5" />
                  Branding
                </Button>
              </Link>
              <Link href={`/w/${slug}/reports`}>
                <Button variant="secondary" size="small">
                  <Download size={13} className="mr-1.5" />
                  Download PDF
                </Button>
              </Link>
            </div>
          </Card>

          {/* Two-column: Pinned Forms (left) + Recent Activity (right) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card className="flex flex-col gap-4">
              <div className="flex items-center gap-2 pb-2 border-b border-neutral-100">
                <Pin size={14} className="text-neutral-500" />
                <h3 className="text-body font-semibold text-neutral-800">Pinned Forms</h3>
              </div>
              <div className="flex flex-col gap-3">
                {forms.slice(0, 5).map((f) => (
                  <div key={f._id} className="flex flex-col gap-1.5 pb-3 border-b border-neutral-100 last:border-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-body-sm font-semibold text-neutral-900">{f.title}</span>
                      <Badge>{f.status === 'published' ? `Active · ${f.responseCount} responses` : 'Draft'}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-caption text-neutral-500">
                      <Link href={`/forms/${f._id}/responses`} className="hover:text-neutral-800 flex items-center gap-1">
                        <Table size={12} /> Responses
                      </Link>
                      <Link href={`/forms/${f._id}/analytics`} className="hover:text-neutral-800 flex items-center gap-1">
                        <BarChart2 size={12} /> Dashboard
                      </Link>
                      <Link href={`/forms/${f._id}/edit`} className="hover:text-neutral-800 flex items-center gap-1">
                        <Edit3 size={12} /> Edit
                      </Link>
                      <Link href={`/w/${slug}/share`} className="hover:text-neutral-800 flex items-center gap-1">
                        <Share2 size={12} /> Share
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="flex flex-col gap-4">
              <div className="pb-2 border-b border-neutral-100">
                <h3 className="text-body font-semibold text-neutral-800">Recent Activity</h3>
              </div>
              <p className="text-caption text-neutral-500">No recent activity in this workspace yet.</p>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
