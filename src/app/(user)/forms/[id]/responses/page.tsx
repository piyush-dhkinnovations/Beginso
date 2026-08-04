'use client';

import { useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { FileText } from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/Button';
import { ResponsesTable } from '@/components/responses/ResponsesTable';
import { formsService } from '@/services/forms';
import { mockResponsesList } from '@/lib/mocks/responsesMocks';
import type { ResponseStatus } from '@/types/response';

export default function ResponsesHubPage() {
  const { id: formId } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const search = searchParams.get('search') ?? '';
  const status = (searchParams.get('status') as ResponseStatus | null) ?? undefined;
  const page = Number(searchParams.get('page') ?? '1');

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: form } = useQuery({
    queryKey: ['form', formId],
    queryFn: () => formsService.getFormById(formId),
    enabled: !!formId,
  });

  const {
    data,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['responses', formId, { search, status, page }],
    // TODO: swap for real backend once docs/backend-contract/api-reference.md §4 endpoints
    // are confirmed live (targeted Wed 06 Aug 2026) — see .kiro/specs/sprint-4-responses/tasks.md 5.7
    queryFn: () => Promise.resolve(mockResponsesList()),
    refetchInterval: 30_000,
    enabled: !!formId,
  });

  if (isError) {
    return (
      <EmptyState
        icon={<FileText />}
        heading="Form not found"
        body="This form doesn't exist or you don't have access."
        action={<Button onClick={() => router.push('/forms')}>Go to Forms</Button>}
      />
    );
  }

  const responses = data?.data ?? [];

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto animate-fade-in">
      <DashboardHeader title="Responses" subtitle={`Responses · ${form?.title ?? ''}`} />
      <ResponsesTable
        responses={responses}
        isLoading={isLoading}
        selectedIds={selectedIds}
        onSelectAll={(checked) =>
          setSelectedIds(checked ? new Set(responses.map((r) => r._id)) : new Set())
        }
        onSelectRow={(id, checked) =>
          setSelectedIds((prev) => {
            const next = new Set(prev);
            if (checked) next.add(id);
            else next.delete(id);
            return next;
          })
        }
        onViewResponse={(id) => router.push(`/responses/${id}?formId=${formId}`)}
        onDeleteResponse={() => {
          /* wired Wednesday — bulk/single delete mutations land in Day 3 */
        }}
      />
    </div>
  );
}
