'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { isAxiosError } from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/common/Toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { AnswerBlock } from './AnswerBlock';
import { FileDownloadButton } from './FileDownloadButton';
import { MetadataSidebar } from './MetadataSidebar';
import { responsesService } from '@/services/responses';
import { responseKeys } from '@/lib/queryKeys';
import { detectRespondentIdentity, shortId } from '@/lib/formatters';
import type { PaginatedResponsesResult, ResponseDetail, ResponseStatus } from '@/types/response';

interface ResponseDrawerProps {
  responseId: string | null;
  /** Undefined on the all-forms view — invalidations target the workspace-wide 'all' cache key. */
  formId?: string;
  onClose: () => void;
}

function DrawerSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4" aria-busy="true">
      <div className="h-64 bg-neutral-100 border border-neutral-200 rounded-lg animate-pulse" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2 p-4 bg-white border border-neutral-200 rounded-lg">
          <div className="h-4 w-32 bg-neutral-100 rounded animate-pulse" />
          <div className="h-4 w-full max-w-sm bg-neutral-100 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export function ResponseDrawer({ responseId, formId, onClose }: ResponseDrawerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const drawerRef = useRef<HTMLDivElement>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // Locks the page behind the drawer while it's open — without this, the drawer's own content
  // and the Responses table underneath both scroll independently (two visible scrollbars,
  // confusing which one the wheel/trackpad is about to move). The actual scrolling element for
  // every (user) route is DashboardShell's <main>, not <body> — this repo has no scroll-lock
  // precedent to follow (Modal.tsx has the same gap), so both are locked: <main> for the real
  // fix, <body> as a harmless no-op safety net if this drawer is ever mounted somewhere else.
  useEffect(() => {
    if (!responseId) return;
    const scrollContainer = document.querySelector('main');
    const previousBodyOverflow = document.body.style.overflow;
    const previousMainOverflow = scrollContainer?.style.overflow;
    document.body.style.overflow = 'hidden';
    if (scrollContainer) scrollContainer.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      if (scrollContainer) scrollContainer.style.overflow = previousMainOverflow ?? '';
    };
  }, [responseId]);

  // Close on Escape; trap Tab/Shift+Tab focus within the drawer — same pattern as Modal.tsx.
  useEffect(() => {
    if (!responseId) return;
    const focusableSelector =
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
    const getFocusable = () =>
      Array.from(drawerRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? []);

    getFocusable()[0]?.focus();

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const focusable = getFocusable();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [responseId, onClose]);

  const { data: response, isLoading } = useQuery({
    queryKey: responseKeys.detail(responseId ?? ''),
    queryFn: () => responsesService.getResponseById(responseId as string),
    enabled: !!responseId,
  });

  const statusMutation = useMutation({
    mutationFn: (status: ResponseStatus) => responsesService.updateStatus(responseId as string, status),
    onMutate: async (status) => {
      const detailKey = responseKeys.detail(responseId as string);
      await queryClient.cancelQueries({ queryKey: detailKey });
      const previousDetail = queryClient.getQueryData<ResponseDetail>(detailKey);
      queryClient.setQueryData<ResponseDetail>(detailKey, (old) => (old ? { ...old, status } : old));

      // Also patch every cached responses-list query for this form, so the table behind
      // the drawer reflects the change immediately, not just after invalidation refetches.
      // responseKeys.all(formId) is a prefix of the stats key too (['responses', formId, 'stats']),
      // so setQueriesData's fuzzy match also hits the stats cache — whose shape has no `data`
      // array. Guard on that shape rather than assuming every match is a paginated list, or the
      // stats entry throws here and the whole mutation aborts before mutationFn ever runs.
      const listKey = responseKeys.all(formId);
      await queryClient.cancelQueries({ queryKey: listKey });
      const previousLists = queryClient.getQueriesData({ queryKey: listKey });
      queryClient.setQueriesData<PaginatedResponsesResult>({ queryKey: listKey }, (old) =>
        old && Array.isArray(old.data)
          ? { ...old, data: old.data.map((r) => (r._id === responseId ? { ...r, status } : r)) }
          : old
      );

      return { previousDetail, previousLists };
    },
    onError: (err, _status, context) => {
      queryClient.setQueryData(responseKeys.detail(responseId as string), context?.previousDetail);
      context?.previousLists?.forEach(([key, data]) => queryClient.setQueryData(key, data));

      // Surface the backend's actual reason (e.g. 422 "Validation failed") instead of a
      // blanket message — the generic text alone gave no way to tell an expired-session 401,
      // a validation 422, or a genuine server 500 apart, either for the user or in the console.
      const serverMessage = isAxiosError(err) ? (err.response?.data as { message?: string } | undefined)?.message : undefined;
      if (isAxiosError(err)) {
        console.error('Status update failed:', err.response?.status, err.response?.data ?? err.message);
      }
      toast(serverMessage ?? 'Failed to update status. Please try again.', 'error');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: responseKeys.detail(responseId as string) });
      // ['responses', formId] is a prefix of the stats key ['responses', formId, 'stats'],
      // so this one invalidation already covers both the list and stats queries — invalidating
      // stats separately here fired its 3-request refetch a second time on every status change.
      queryClient.invalidateQueries({ queryKey: responseKeys.all(formId) });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => responsesService.deleteResponse(responseId as string),
    onSuccess: () => {
      toast('Response deleted.', 'success');
      onClose();
    },
    onError: () => toast('Failed to delete response. Please try again.', 'error'),
    onSettled: () => {
      setConfirmDeleteOpen(false);
      queryClient.invalidateQueries({ queryKey: responseKeys.all(formId) });
    },
  });

  if (!responseId) return null;

  const identity = response ? detectRespondentIdentity(response.answers) : {};
  const hasIdentity = !!(identity.label || identity.email);
  const initial = (identity.label ?? identity.email ?? '?').charAt(0).toUpperCase();

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex justify-end bg-black/40 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        ref={drawerRef}
        className="relative w-full sm:max-w-lg h-full bg-white shadow-2xl border-l border-neutral-200 flex flex-col animate-slide-in-right"
      >
        <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-200 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {response && hasIdentity && (
              <span
                aria-hidden="true"
                className="w-8 h-8 shrink-0 rounded-full bg-brand-100 text-brand-700 text-body-sm font-semibold flex items-center justify-center"
              >
                {initial}
              </span>
            )}
            <div className="min-w-0">
              <h2 id="drawer-title" className="text-heading-3 font-semibold text-neutral-900 truncate">
                {response ? (identity.label ?? identity.email ?? `Response #${shortId(response._id)}`) : 'Response'}
              </h2>
              {response && (
                <p className="text-caption text-neutral-500 truncate">
                  Response #{shortId(response._id)}
                  {identity.email && identity.label ? ` · ${identity.email}` : ''}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading || !response ? (
            <DrawerSkeleton />
          ) : (
            <div className="flex flex-col gap-4 p-4">
              <MetadataSidebar
                response={response}
                onStatusChange={(s) => statusMutation.mutate(s)}
                isUpdatingStatus={statusMutation.isPending}
              />

              {response.responseFiles.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h3 className="text-heading-3 font-semibold text-neutral-800">Attachments</h3>
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
                </div>
              )}

              <div className="flex flex-col gap-2">
                <h3 className="text-heading-3 font-semibold text-neutral-800">Submitted Answers</h3>
                <div className="flex flex-col p-4 bg-white border border-neutral-200 rounded-lg">
                  {Object.entries(response.answers).map(([label, value]) => (
                    <AnswerBlock key={label} label={label} value={value} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {response && (
          <div className="shrink-0 p-4 border-t border-neutral-200 bg-white">
            <Button variant="destructive" size="small" className="w-full" onClick={() => setConfirmDeleteOpen(true)}>
              Delete Response
            </Button>
          </div>
        )}
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
