'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList } from 'lucide-react';
import { respondentService } from '@/services/respondent';
import { respondentKeys } from '@/lib/queryKeys';
import { formatResponseDate } from '@/lib/formatters';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, type TableColumn } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import type { MySubmission } from '@/types/respondent';

// Sprint 13 (A5.1), wireframe 31. The signed-in respondent's own submissions. Status is the respondent-safe
// label the server derives — never a workspace stage. Lives in the personal shell (OQ-6: a dedicated two-item
// respondent shell was not built; the personal nav already shows "My Submissions" once there is one).
export default function MySubmissionsPage() {
  const query = useQuery({ queryKey: respondentKeys.mine(), queryFn: respondentService.mine, retry: false });
  const rows = query.data ?? [];

  const columns: TableColumn<MySubmission>[] = [
    {
      key: 'form',
      header: 'Form',
      render: (s) => (
        <div>
          <strong className="text-(--text-primary)">{s.formName}</strong>
          {s.ownerName && <small className="block text-(--text-muted)">{s.ownerName}</small>}
        </div>
      ),
    },
    { key: 'submitted', header: 'Submitted', render: (s) => <span className="bg-body-sm">{formatResponseDate(s.submittedAt)}</span> },
    { key: 'status', header: 'Status', render: (s) => <Badge variant="neutral">{s.status}</Badge> },
    {
      key: 'action',
      header: 'Action',
      align: 'right',
      render: (s) => (
        <Link href={`/my-submissions/${s.id}`}>
          <Button variant="secondary" size="small" className="min-h-11">
            View
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <PageHeader eyebrow="Personal space" title="My Submissions" description="Track forms you filled out for other people." />
      {query.isError ? (
        <Alert variant="error" title="We could not load your submissions.">
          <Button size="small" variant="secondary" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </Alert>
      ) : !query.isLoading && rows.length === 0 ? (
        <EmptyState
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
        <Table columns={columns} rows={rows} rowKey={(s) => s.id} isLoading={query.isLoading} />
      )}
      <Alert variant="info">Your submissions are linked to your account only when you claim them from a signed email link.</Alert>
    </div>
  );
}
