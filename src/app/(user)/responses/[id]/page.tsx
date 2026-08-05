'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/common/Toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { AnswerBlock } from '@/components/responses/AnswerBlock';
import { FileDownloadButton } from '@/components/responses/FileDownloadButton';
import { MetadataSidebar } from '@/components/responses/MetadataSidebar';
import { responsesService } from '@/services/responses';
import { formsService } from '@/services/forms';
import { responseKeys } from '@/lib/queryKeys';
import { shortId } from '@/lib/formatters';
import type { PaginatedResponsesResult, ResponseDetail, ResponseStatus } from '@/types/response';

function DetailSkeleton() {
  return (
    <div className="flex flex-col md:flex-row gap-6" aria-busy="true">
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2 p-4 bg-white border border-neutral-200 rounded-lg">
            <div className="h-4 w-32 bg-neutral-100 rounded animate-pulse" />
            <div className="h-4 w-full max-w-sm bg-neutral-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div className="w-full md:w-[280px] shrink-0 h-64 bg-white border border-neutral-200 rounded-lg animate-pulse" />
    </div>
  );
}

export default function ResponseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const formId = searchParams.get('formId');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const { data: response, isLoading, isError } = useQuery({
    queryKey: responseKeys.detail(id),
    queryFn: () => responsesService.getResponseById(id),
    enabled: !!id,
  });

  const { data: form } = useQuery({
    queryKey: ['form', formId],
    queryFn: () => formsService.getFormById(formId as string),
    enabled: !!formId,
  });

  useEffect(() => {
    if (isError) {
      toast('Response not found or access denied.', 'error');
      router.push('/forms');
    }
  }, [isError, router, toast]);

  const statusMutation = useMutation({
    mutationFn: (status: ResponseStatus) => responsesService.updateStatus(id, status),
    onMutate: async (status) => {
      const detailKey = responseKeys.detail(id);
      await queryClient.cancelQueries({ queryKey: detailKey });
      const previousDetail = queryClient.getQueryData<ResponseDetail>(detailKey);
      queryClient.setQueryData<ResponseDetail>(detailKey, (old) => (old ? { ...old, status } : old));

      // Also patch every cached responses-list query for this form, so the table
      // reflects the change immediately if the user navigates back to it — not just
      // after this page's own invalidation triggers a refetch.
      let previousLists: [readonly unknown[], unknown][] = [];
      if (formId) {
        const listKey = responseKeys.all(formId);
        await queryClient.cancelQueries({ queryKey: listKey });
        previousLists = queryClient.getQueriesData({ queryKey: listKey });
        queryClient.setQueriesData<PaginatedResponsesResult>({ queryKey: listKey }, (old) =>
          old ? { ...old, data: old.data.map((r) => (r._id === id ? { ...r, status } : r)) } : old
        );
      }

      return { previousDetail, previousLists };
    },
    onError: (_err, _status, context) => {
      queryClient.setQueryData(responseKeys.detail(id), context?.previousDetail);
      context?.previousLists?.forEach(([key, data]) => queryClient.setQueryData(key, data));
      toast('Failed to update status. Please try again.', 'error');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: responseKeys.detail(id) });
      if (formId) queryClient.invalidateQueries({ queryKey: responseKeys.all(formId) });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => responsesService.deleteResponse(id),
    onSuccess: () => {
      toast('Response deleted.', 'success');
      router.push(formId ? `/forms/${formId}/responses` : '/forms');
    },
    onError: () => toast('Failed to delete response. Please try again.', 'error'),
    onSettled: () => setConfirmDeleteOpen(false),
  });

  const responsesHref = formId ? `/forms/${formId}/responses` : '/forms';

  if (isLoading || !response) {
    return (
      <div className="flex flex-col gap-6 max-w-6xl mx-auto animate-fade-in">
        <div className="h-4 w-64 bg-neutral-100 rounded animate-pulse" />
        <DetailSkeleton />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto animate-fade-in">
      <nav aria-label="Breadcrumb" className="text-body-sm text-neutral-500">
        <Link href="/forms" className="hover:text-neutral-800">Forms</Link>
        {form?.title && (
          <>
            {' / '}
            <Link href={responsesHref} className="hover:text-neutral-800">{form.title}</Link>
          </>
        )}
        {' / '}
        <Link href={responsesHref} className="hover:text-neutral-800">Responses</Link>
        {' / '}
        <span className="text-neutral-800 font-medium">Response #{shortId(response._id)}</span>
      </nav>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          <h2 className="text-heading-2 font-bold text-neutral-800">Submitted Answers</h2>
          {Object.entries(response.answers).map(([label, value]) => (
            <AnswerBlock key={label} label={label} value={value} />
          ))}

          {response.responseFiles.length > 0 && (
            <>
              <h2 className="text-heading-2 font-bold text-neutral-800 mt-2">Attachments</h2>
              <div className="flex flex-col gap-2 p-4 bg-white border border-neutral-200 rounded-lg">
                {response.responseFiles.map((file) => (
                  <FileDownloadButton
                    key={file.id}
                    responseId={response._id}
                    fileId={file.id}
                    originalName={file.name}
                    size={file.size}
                    mimeType={file.type}
                    isAvailable
                  />
                ))}
              </div>
            </>
          )}
        </div>
        <MetadataSidebar
          response={response}
          onStatusChange={(s) => statusMutation.mutate(s)}
          onDeleteClick={() => setConfirmDeleteOpen(true)}
          isUpdatingStatus={statusMutation.isPending}
        />
      </div>

      <Modal
        isOpen={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        title="Delete this response?"
        description="This will permanently delete the response and all uploaded files. This action cannot be undone."
      >
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-neutral-100">
          <Button variant="secondary" onClick={() => setConfirmDeleteOpen(false)} disabled={deleteMutation.isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => deleteMutation.mutate()} isLoading={deleteMutation.isPending}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
