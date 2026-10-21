'use client';

import { disambiguateActors } from '@/lib/auditActors';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Shield, Lock } from 'lucide-react';
import { eventsService } from '@/services/events';
import { teamService } from '@/services/team';
import { workspacesService } from '@/services/workspaces';
import { auditKeys, teamKeys, workspaceKeys } from '@/lib/queryKeys';
import { canViewAudit } from '@/lib/roles';
import { PageHeader, Card, Alert, Button, EmptyState } from '@/components/ui';
import { AuditFilters, AUDIT_RANGE_LABEL } from '@/components/team/AuditFilters';
import { AuditTable } from '@/components/team/AuditTable';
import { useEventAvatars } from '@/hooks/useEventAvatars';
import type { AuditFilters as AuditFilterValues } from '@/types/event';

const PAGE_SIZE = 20;

type Range = NonNullable<AuditFilterValues['range']>;

// Audit Log — requirements.md §7.7, design.md §5/§15.3. Owner/Admin only. That gate is a
// convenience here (CLAUDE.md): GET /api/workspaces/:id/audit must enforce it, and a 403 from it
// lands on the same permission state as a role that is known not to qualify.
// Server-side filtering and paging throughout — Previous/Next because the contract returns a bare
// array with no total (design.md §11.2), so Next appears only after a full page.
export default function AuditLogPage() {
  const { slug } = useParams<{ slug: string }>();
  const avatarOf = useEventAvatars(slug);
  const [actorId, setActorId] = useState('');
  const [range, setRange] = useState<Range>('all');
  const [page, setPage] = useState(1);

  // Same source the Team page reads its role from.
  const workspacesQuery = useQuery({ queryKey: workspaceKeys.list(), queryFn: workspacesService.list });
  const role = workspacesQuery.data?.find((w) => w.slug === slug)?.role;
  const canView = canViewAudit(role);

  const membersQuery = useQuery({
    queryKey: teamKeys.members(slug),
    queryFn: () => teamService.listMembers(slug),
    enabled: canView,
  });

  const filters = { actorId: actorId || undefined, range, page };
  const auditQuery = useQuery({
    queryKey: auditKeys.list(slug, filters),
    queryFn: () => eventsService.listAudit(slug, { ...filters, limit: PAGE_SIZE }),
    enabled: canView,
  });

  const events = auditQuery.data ?? [];
  const header = (
    <PageHeader
      title="Audit Log"
      description={
        auditQuery.data && events.length > 0
          ? [`${events.length}${events.length >= PAGE_SIZE ? '+' : ''} event${events.length === 1 ? '' : 's'} on this page`, AUDIT_RANGE_LABEL[range].toLowerCase()].join(' · ')
          : undefined
      }
    />
  );

  const denied = (
    <EmptyState illustration="no-access" icon={<Lock className="bg-icon" aria-hidden="true" />} title="You do not have access to the audit log." />
  );

  if (workspacesQuery.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {header}
        <Card>
          <AuditTable events={[]} isLoading />
        </Card>
      </div>
    );
  }

  if (workspacesQuery.isError) {
    return (
      <div className="flex flex-col gap-4">
        {header}
        <Alert variant="error" title="We could not load the audit log.">
          <Button variant="secondary" size="small" onClick={() => void workspacesQuery.refetch()}>
            Retry
          </Button>
        </Alert>
      </div>
    );
  }

  const status = (auditQuery.error as { response?: { status?: number } } | null)?.response?.status;
  if (!canView || status === 403) {
    return (
      <div className="flex flex-col gap-4">
        {header}
        {denied}
      </div>
    );
  }

  const hasNext = events.length >= PAGE_SIZE;
  const filtersActive = actorId !== '' || range !== 'all';
  const actors = disambiguateActors((membersQuery.data ?? []).map((m) => ({ id: m.userId, name: m.name, email: m.email })));

  // Nothing recorded and nothing filtered: the filters would be controls over zero events.
  const isFirstRun = !auditQuery.isLoading && !auditQuery.isError && events.length === 0 && page === 1 && !filtersActive;

  return (
    <div className="flex flex-col gap-4">
      {header}

      {!isFirstRun && <AuditFilters
        actors={actors}
        actorId={actorId}
        range={range}
        onActorChange={(next) => {
          setActorId(next);
          setPage(1);
        }}
        onRangeChange={(next) => {
          setRange(next);
          setPage(1);
        }}
      />}

      <div>
        {auditQuery.isError ? (
          <Alert variant="error" title="We could not load the audit log.">
            <Button variant="secondary" size="small" onClick={() => void auditQuery.refetch()}>
              Retry
            </Button>
          </Alert>
        ) : auditQuery.isLoading ? (
          <AuditTable events={[]} isLoading />
        ) : events.length === 0 && page === 1 ? (
          // Two different empty screens, not one reused (wireframe-guide.md; design.md §17): nothing
          // has ever been recorded vs. a filter that matched nothing.
          filtersActive ? (
            <EmptyState illustration="no-results"
              icon={<Shield className="bg-icon" aria-hidden="true" />}
              title={`No events ${[actorId && `from ${actors.find((a) => a.id === actorId)?.name ?? 'that actor'}`, range !== 'all' && `in the ${AUDIT_RANGE_LABEL[range].toLowerCase()}`].filter(Boolean).join(' ')}`}
              actions={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setActorId('');
                    setRange('all');
                    setPage(1);
                  }}
                >
                  Clear filter
                </Button>
              }
            />
          ) : (
            <EmptyState illustration="team"
              icon={<Shield className="bg-icon" aria-hidden="true" />}
              title="No activity recorded yet."
              description="Audit events will appear here once your team starts making changes."
            />
          )
        ) : (
          <div className="flex flex-col gap-4">
            <AuditTable events={events} avatarOf={avatarOf} />
            <div className="flex items-center justify-between border-t border-(--border-subtle) pt-3">
              <Button variant="secondary" size="small" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="bg-caption text-(--text-muted)">Page {page} · {events.length} events</span>
              <Button variant="secondary" size="small" disabled={!hasNext} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
