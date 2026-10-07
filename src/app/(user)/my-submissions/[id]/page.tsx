'use client';

import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { respondentService } from '@/services/respondent';
import { respondentKeys } from '@/lib/queryKeys';
import { PageHeader } from '@/components/ui/PageHeader';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { SubmissionView } from '@/components/respondent/SubmissionView';

// Sprint 13 (A5.1 / A5.2): one of MY submissions, with in-place correction. Someone else's id is a 404 from the
// server, shown here as "not found" — never as a permission hint.
export default function MySubmissionPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: respondentKeys.detail(id), queryFn: () => respondentService.detail(id), retry: false });

  const notFound = (query.error as { response?: { status?: number } } | null)?.response?.status === 404;

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <PageHeader
        breadcrumb={[{ label: 'My Submissions', href: '/my-submissions' }, { label: query.data?.formName ?? 'Submission' }]}
        title={query.data?.formName ?? 'Submission'}
      />
      {query.isLoading ? (
        <Skeleton variant="text" width="100%" height={160} />
      ) : notFound ? (
        <Alert variant="info" title="We could not find that submission." />
      ) : query.isError || !query.data ? (
        <Alert variant="error" title="We could not load this submission.">
          <Button size="small" variant="secondary" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </Alert>
      ) : (
        <SubmissionView
          fields={query.data.fields ?? []}
          status={query.data.status}
          canEdit={!!query.data.canEdit}
          readOnlyReason={query.data.readOnlyReason}
          onSave={async (answers) => {
            const result = await respondentService.edit(id, answers);
            await queryClient.invalidateQueries({ queryKey: respondentKeys.detail(id) });
            void queryClient.invalidateQueries({ queryKey: respondentKeys.mine() });
            return result;
          }}
        />
      )}
    </div>
  );
}
