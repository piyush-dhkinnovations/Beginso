'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, Search } from 'lucide-react';
import { respondentService } from '@/services/respondent';
import { respondentKeys } from '@/lib/queryKeys';
import { formatRelativeTime, formatResponseDate } from '@/lib/formatters';
import { FormTile } from '@/components/forms/FormTile';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import type { MySubmission, RespondentStatus } from '@/types/respondent';

// Sprint 13 (A5.1), wireframe 31. The signed-in respondent's own submissions. Status is the respondent-safe
// label the server derives — never a workspace stage. Lives in the personal shell (OQ-6: a dedicated two-item
// respondent shell was not built; the personal nav already shows "My Submissions" once there is one).
//
// The same card as the Forms page (FormCard): the form's mark on the left, its name as the link, who it is from, then the status
// chip and when it was sent. A row of counts above doubles as the status filter.
const STATUS_VARIANT: Record<RespondentStatus, 'new' | 'in_progress' | 'completed' | 'neutral'> = {
  Received: 'new',
  'In review': 'in_progress',
  Completed: 'completed',
  Edited: 'neutral',
};
const STATUSES: RespondentStatus[] = ['Received', 'In review', 'Edited', 'Completed'];

function SubmissionCard({ s }: { s: MySubmission }) {
  return (
    <Card padded={false} className="relative flex-row items-stretch gap-4 overflow-hidden bg-none bg-(--surface-card) p-4 transition-colors hover:bg-(--surface-hover) has-focus-visible:shadow-(--shadow-focus)">
      <div className="flex flex-none items-center">
        <FormTile title={s.formName} size={48} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="min-w-0 bg-body font-semibold text-(--text-primary)">
            {/* The link's ::after covers the whole card, so a click anywhere on it opens the submission. */}
            <Link href={`/my-submissions/${s.id}`} className="block truncate no-underline after:absolute after:inset-0 after:content-[''] hover:underline">
              {s.formName}
            </Link>
          </h3>
          <p className="line-clamp-1 bg-body-sm text-(--text-muted)">{s.ownerName ? `from ${s.ownerName}` : 'Submitted while signed in'}</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <StatusBadge variant={STATUS_VARIANT[s.status] ?? 'neutral'}>{s.status}</StatusBadge>
          <span className="bg-caption text-(--text-muted)" title={formatResponseDate(s.submittedAt)}>
            {formatRelativeTime(s.submittedAt)}
          </span>
        </div>
      </div>
    </Card>
  );
}

export default function MySubmissionsPage() {
  const query = useQuery({ queryKey: respondentKeys.mine(), queryFn: respondentService.mine, retry: false });
  const rows = useMemo(() => query.data ?? [], [query.data]);
  const [status, setStatus] = useState<RespondentStatus | 'All'>('All');
  const [search, setSearch] = useState('');

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    rows.forEach((r) => (c[r.status] = (c[r.status] ?? 0) + 1));
    return c;
  }, [rows]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((r) => (status === 'All' || r.status === status) && (!term || `${r.formName} ${r.ownerName}`.toLowerCase().includes(term)));
  }, [rows, status, search]);

  const chip = (value: RespondentStatus | 'All', label: string, count: number) => (
    <button
      key={value}
      type="button"
      aria-pressed={status === value}
      onClick={() => setStatus(value)}
      className={cn(
        'inline-flex min-h-9 items-center gap-2 rounded-full px-4 bg-body-sm font-semibold transition-colors',
        status === value
          ? 'bg-(--action-primary) text-(--text-on-brand)'
          : 'border border-(--border-default) bg-(--surface-card) text-(--text-secondary) hover:bg-(--surface-hover)'
      )}
    >
      {label}
      <span className={cn('rounded-full px-1.5 bg-caption', status === value ? 'bg-white/20' : 'bg-(--surface-hover) text-(--text-muted)')}>{count}</span>
    </button>
  );

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      <PageHeader
        eyebrow="Personal space"
        title="My Submissions"
        description="Every form you filled in while signed in, with where it stands. Open one to see what you sent or, where the form allows it, correct it."
      />

      {query.isError ? (
        <Alert variant="error" title="We could not load your submissions.">
          <Button size="small" variant="secondary" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </Alert>
      ) : query.isLoading ? (
        <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <li key={i}>
              <Skeleton variant="block" width="100%" height={150} />
            </li>
          ))}
        </ul>
      ) : rows.length === 0 ? (
        <EmptyState
          illustration="empty-inbox"
          icon={<ClipboardList />}
          title="You have not submitted anything yet"
          description="Forms you fill out while signed in will show up here."
          primaryAction={
            <Link href="/dashboard">
              <Button>Back to Home</Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
              {chip('All', 'All', rows.length)}
              {STATUSES.filter((st) => counts[st]).map((st) => chip(st, st, counts[st]))}
            </div>
            <div className="w-full sm:w-64">
              <Input
                id="my-submissions-search"
                aria-label="Search your submissions"
                placeholder="Search by form or sender…"
                leftIcon={<Search size={16} aria-hidden="true" />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {visible.length === 0 ? (
            <EmptyState
              illustration="no-results"
              icon={<Search />}
              title="No matching submissions"
              description="Try a different search or status."
              actions={
                <Button variant="secondary" onClick={() => { setSearch(''); setStatus('All'); }}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((s) => (
                <li key={s.id}>
                  <SubmissionCard s={s} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
