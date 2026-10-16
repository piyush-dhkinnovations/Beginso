'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  LockKeyhole,
  Maximize2,
  Minimize2,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { isAxiosError } from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/common/Toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { AnswerBlock } from './AnswerBlock';
import { MetadataSidebar } from './MetadataSidebar';
import { StatusDropdown } from './StatusDropdown';
import { UploadedFilesPreview } from './UploadedFilesPreview';
import { responsesService } from '@/services/responses';
import { formsService } from '@/services/forms';
<<<<<<< Updated upstream
import { responseKeys } from '@/lib/queryKeys';
import { detectRespondentIdentity, shortId } from '@/lib/formatters';
=======
import { tagsService } from '@/services/tags';
import { reportsService } from '@/services/reports';
import { useInboxMutations } from '@/hooks/useInboxMutations';
import { useMembers } from '@/hooks/useMembers';
import { useTags } from '@/hooks/useTags';
import { useAuth } from '@/hooks/useAuth';
import { formAccessKeys, noteKeys, responseKeys, workspaceKeys } from '@/lib/queryKeys';
import { detectRespondentIdentity, initialsOf, shortId } from '@/lib/formatters';
import { exportPayloadFromTarget } from '@/lib/reportExport';
import { buildAnswerItems, isTopImage } from '@/lib/responseAnswers';
import { hasCapability } from '@/lib/roles';
>>>>>>> Stashed changes
import { cn } from '@/lib/utils';
import type { PaginatedResponsesResult, ResponseDetail } from '@/types/response';
import type { StageRef } from '@/types/stage';

interface ResponseDrawerProps {
  responseId: string | null;
  /** Undefined on the all-forms view — invalidations target the workspace-wide 'all' cache key. */
  formId?: string;
  /** Workspace slug, or 'personal' (OQ-1). */
  scope?: string;
  stages?: readonly StageRef[];
  formTitle?: string;
  fileFieldLabels?: string[];
  displayMode?: 'drawer' | 'page';
  position?: number;
  totalResponses?: number;
  hasPrevious?: boolean;
  hasNext?: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
  onExpand?: (response: ResponseDetail) => void;
  collapseHref?: string;
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

function DrawerErrorState({
  error,
  isRetrying,
  onRetry,
  onClose,
}: {
  error: unknown;
  isRetrying: boolean;
  onRetry: () => void;
  onClose: () => void;
}) {
  const status = isAxiosError(error) ? error.response?.status : undefined;
  const isAccessDenied = status === 403;
  const isNotFound = status === 404;
  const heading = isAccessDenied
    ? 'Access denied'
    : isNotFound
      ? 'Response not found'
      : 'Unable to load response';
  const body = isAccessDenied
    ? "You don't have permission to view this response."
    : isNotFound
      ? 'This response may have been deleted or is no longer available.'
      : 'Something went wrong while loading this response. Please try again.';
  const canRetry = !isAccessDenied && !isNotFound;
  const Icon = isAccessDenied ? LockKeyhole : AlertCircle;

  return (
    <div role="alert" className="flex min-h-64 flex-col items-center justify-center gap-3 p-6 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-error">
        <Icon size={24} aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <h3 className="text-heading-3 font-semibold text-neutral-900">{heading}</h3>
        <p className="max-w-sm text-body-sm text-neutral-600">{body}</p>
      </div>
      <div className="flex items-center gap-2 pt-1">
        <Button variant="secondary" size="small" onClick={onClose}>
          Close
        </Button>
        {canRetry && (
          <Button size="small" onClick={onRetry} isLoading={isRetrying}>
            Try again
          </Button>
        )}
      </div>
    </div>
  );
}

export function ResponseDrawer({
  responseId,
  formId,
  scope = 'personal',
  stages = [],
  formTitle,
  fileFieldLabels = [],
  displayMode = 'drawer',
  position,
  totalResponses,
  hasPrevious = false,
  hasNext = false,
  onPrevious,
  onNext,
  onExpand,
  collapseHref,
  onClose,
}: ResponseDrawerProps) {
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
    if (!responseId || displayMode === 'page') return;
    const scrollContainer = document.querySelector('main');
    const previousBodyOverflow = document.body.style.overflow;
    const previousMainOverflow = scrollContainer?.style.overflow;
    document.body.style.overflow = 'hidden';
    if (scrollContainer) scrollContainer.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      if (scrollContainer) scrollContainer.style.overflow = previousMainOverflow ?? '';
    };
  }, [displayMode, responseId]);

  // Close on Escape; trap Tab/Shift+Tab focus within the drawer — same pattern as Modal.tsx.
  useEffect(() => {
    if (!responseId) return;
    if (displayMode === 'page') return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
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
    return () => {
      document.removeEventListener('keydown', handler);
      previouslyFocused?.focus();
    };
  }, [displayMode, responseId, onClose]);

  const { data: response, error: responseError, isError, isFetching, isLoading, refetch } = useQuery({
    queryKey: responseKeys.detail(scope, responseId ?? ''),
    queryFn: () => responsesService.getResponseById(responseId as string, scope),
    enabled: !!responseId,
  });

  const { data: responseForm } = useQuery({
    queryKey: ['form', response?.formId],
    queryFn: () => formsService.getFormById(response?.formId as string),
    enabled: !!response?.formId && response.responseFiles.length > 0 && fileFieldLabels.length === 0,
  });

  const resolvedFileFieldLabels = fileFieldLabels.length > 0
    ? fileFieldLabels
    : (responseForm?.fields ?? [])
        .filter((field) => field.type === 'file_upload' && !field.deleted)
        .sort((a, b) => a.order - b.order)
        .map((field) => field.label);

  const stageMutation = useMutation({
    mutationFn: (stageId: string) => responsesService.update(responseId as string, { stageId }, scope),
    onMutate: async (stageId) => {
      const detailKey = responseKeys.detail(scope, responseId as string);
      await queryClient.cancelQueries({ queryKey: detailKey });
      const previousDetail = queryClient.getQueryData<ResponseDetail>(detailKey);
      queryClient.setQueryData<ResponseDetail>(detailKey, (old) =>
        old ? { ...old, stage: { ...old.stage, id: stageId } } : old
      );

      // Also patch every cached responses-list query for this form, so the table behind
      // the drawer reflects the change immediately, not just after invalidation refetches.
      // responseKeys.all(scope, formId) is a prefix of the stats key too, so setQueriesData's
      // fuzzy match also hits the stats cache — whose shape has no `data` array. Guard on that
      // shape rather than assuming every match is a paginated list, or the stats entry throws
      // here and the whole mutation aborts before mutationFn ever runs.
      const listKey = responseKeys.all(scope, formId);
      await queryClient.cancelQueries({ queryKey: listKey });
      const previousLists = queryClient.getQueriesData({ queryKey: listKey });
      queryClient.setQueriesData<PaginatedResponsesResult>({ queryKey: listKey }, (old) =>
        old && Array.isArray(old.data)
          ? { ...old, data: old.data.map((r) => (r._id === responseId ? { ...r, stage: { ...r.stage, id: stageId } } : r)) }
          : old
      );

      return { previousDetail, previousLists };
    },
    onError: (err, _stageId, context) => {
      queryClient.setQueryData(responseKeys.detail(scope, responseId as string), context?.previousDetail);
      context?.previousLists?.forEach(([key, data]) => queryClient.setQueryData(key, data));

      // Surface the backend's actual reason (e.g. 422 "Validation failed") instead of a
      // blanket message — the generic text alone gave no way to tell an expired-session 401,
      // a validation 422, or a genuine server 500 apart, either for the user or in the console.
      const serverMessage = isAxiosError(err) ? (err.response?.data as { message?: string } | undefined)?.message : undefined;
      if (isAxiosError(err)) {
        console.error('Stage update failed:', err.response?.status, err.response?.data ?? err.message);
      }
      toast(serverMessage ?? 'Failed to update stage. Please try again.', 'error');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: responseKeys.detail(scope, responseId as string) });
      // A prefix of the stats key too, so this one invalidation already covers both the list and
      // stats queries — invalidating stats separately here fired its refetch a second time.
      queryClient.invalidateQueries({ queryKey: responseKeys.all(scope, formId) });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => responsesService.deleteResponse(responseId as string, scope),
    onSuccess: () => {
      toast('Response deleted.', 'success');
      onClose();
    },
    onError: () => toast('Failed to delete response. Please try again.', 'error'),
    onSettled: () => {
      setConfirmDeleteOpen(false);
      queryClient.invalidateQueries({ queryKey: responseKeys.all(scope, formId) });
    },
  });

  if (!responseId) return null;

  const identity = response ? detectRespondentIdentity(response.answers, responseForm?.fields) : {};
  const hasIdentity = !!(identity.label || identity.email);
<<<<<<< Updated upstream
  const initial = (identity.label ?? identity.email ?? '?').charAt(0).toUpperCase();
=======
  const initial = initialsOf(identity.label ?? identity.email).charAt(0) || '?';
  // A failed/absent form lookup falls back to plain label → value rows rather than blocking the answers.
  const answerItems = response ? buildAnswerItems(response.answers, response.responseFiles, responseForm?.fields, responseForm?.pages, fileFieldLabels) : [];
  const topImages = answerItems.filter(isTopImage);
  const otherAnswers = answerItems.filter((item) => !isTopImage(item));
>>>>>>> Stashed changes

  return (
    <div
      role={displayMode === 'drawer' ? 'presentation' : undefined}
      className={cn(
        displayMode === 'drawer'
          ? 'fixed inset-0 z-50 flex justify-end bg-black/40 animate-fade-in'
          : 'mx-auto flex min-h-[calc(100vh-104px)] w-full max-w-6xl animate-fade-in'
      )}
      onClick={(e) => {
        if (displayMode === 'drawer' && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role={displayMode === 'drawer' ? 'dialog' : 'main'}
        aria-modal={displayMode === 'drawer' ? true : undefined}
        aria-labelledby="drawer-title"
        ref={drawerRef}
        className={cn(
          'relative flex w-full flex-col overflow-hidden border border-neutral-200 bg-white',
          displayMode === 'drawer'
            ? 'h-full border-y-0 border-r-0 shadow-2xl animate-slide-in-right sm:max-w-[min(1180px,calc(100vw-32px))]'
            : 'min-h-full rounded-lg shadow-card'
        )}
      >
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-neutral-200 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {response && hasIdentity && (
              <span
                aria-hidden="true"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-body-sm font-semibold text-brand-700"
              >
                {initial}
              </span>
            )}
            <div className="min-w-0">
              <h2 id="drawer-title" className="truncate text-heading-2 text-neutral-900">Response Details</h2>
              {response && (
                <p className="flex min-w-0 items-center gap-1 truncate text-body-sm text-neutral-500">
                  <span className="truncate">{formTitle ?? responseForm?.title ?? identity.label ?? identity.email ?? `Response #${shortId(response._id)}`}</span>
                  {identity.email && identity.label ? ` · ${identity.email}` : ''}
                </p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {response && stages.length > 0 && (
              <StatusDropdown
                stages={stages}
                currentStageId={response.stage?.id ?? ''}
                onChange={(stageId) => stageMutation.mutate(stageId)}
                disabled={stageMutation.isPending}
              />
            )}
            {position !== undefined && totalResponses !== undefined && (
              <div className="flex items-center gap-1">
                <Button
                  variant="secondary"
                  size="small"
                  onClick={onPrevious}
                  disabled={!hasPrevious}
                  className="gap-1 px-2"
                  aria-label="Previous response"
                >
                  <ChevronLeft size={14} aria-hidden="true" />
                  <span className="hidden xl:inline">Previous</span>
                </Button>
                <span className="hidden min-w-16 px-1 text-center text-body-sm text-neutral-500 md:inline">
                  {position} of {totalResponses}
                </span>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={onNext}
                  disabled={!hasNext}
                  className="gap-1 px-2"
                  aria-label="Next response"
                >
                  <span className="hidden xl:inline">Next</span>
                  <ChevronRight size={14} aria-hidden="true" />
                </Button>
              </div>
            )}
            {displayMode === 'drawer' && onExpand && (
              <button
                type="button"
                onClick={() => response && onExpand(response)}
                aria-label="Open response in full page"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-md border border-neutral-200 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
              >
                <Maximize2 size={17} aria-hidden="true" />
              </button>
            )}
            {displayMode === 'page' && collapseHref ? (
              <a
                href={collapseHref}
                aria-label="Return to response drawer"
                className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
              >
                <Minimize2 size={18} />
              </a>
            ) : (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <DrawerSkeleton />
          ) : isError || !response ? (
            <DrawerErrorState
              error={responseError}
              isRetrying={isFetching}
              onRetry={() => void refetch()}
              onClose={onClose}
            />
          ) : (
            <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <section className="flex min-w-0 flex-col gap-4 rounded-lg border border-neutral-200 bg-white p-4">
                <div>
                  <h3 className="text-heading-3 text-neutral-800">Submission Overview</h3>
                  <p className="mt-0.5 text-body-xs text-neutral-400">Uploaded files and submission information</p>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-label text-neutral-500">Uploaded files</span>
                  <UploadedFilesPreview responseId={response._id} files={response.responseFiles} />
                </div>
                <MetadataSidebar response={response} />
              </section>

              <section className="min-w-0 rounded-lg border border-neutral-200 bg-white p-4">
                <div className="mb-3">
                  <h3 className="text-heading-3 text-neutral-800">Submitted Answers</h3>
                  <p className="mt-0.5 text-body-xs text-neutral-400">All answers provided with this response</p>
                </div>
                <div className="flex flex-col rounded-lg border border-neutral-200 px-4">
                  {Object.keys(response.answers).length === 0 && response.responseFiles.length === 0 ? (
                    <p className="py-6 text-center text-body-sm text-neutral-500">No submitted answers.</p>
                  ) : (
                    Object.entries(response.answers).map(([label, value]) => (
                      <AnswerBlock key={label} label={label} value={value} />
                    ))
                  )}
                  {response.responseFiles.map((file, index) => (
                    <div key={file.id} className="flex items-center justify-between gap-4 border-b border-neutral-100 py-2.5 last:border-0">
                      <span className="shrink-0 text-body-sm text-neutral-500">
                        {resolvedFileFieldLabels[index] ?? (response.responseFiles.length === 1 ? 'Uploaded file' : `Uploaded file ${index + 1}`)}
                      </span>
                      <span className="flex min-w-0 items-center gap-2 text-right text-body-sm font-medium text-neutral-800">
                        <FileText size={14} className="shrink-0 text-neutral-400" aria-hidden="true" />
                        <span className="truncate" title={file.name}>{file.name}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>

        {response && (
          <div className="flex shrink-0 flex-col gap-3 border-t border-neutral-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center gap-2">
              <Button onClick={() => undefined} className="gap-2">
                <Download size={16} aria-hidden="true" />
                Download Response
              </Button>
              <Button variant="ghost" size="small" className="gap-1.5 text-error" onClick={() => setConfirmDeleteOpen(true)}>
                <Trash2 size={14} aria-hidden="true" />
                Delete Response
              </Button>
            </div>
            <div className="flex items-center gap-2 text-body-xs text-neutral-500">
              <ShieldCheck size={14} className="shrink-0 text-neutral-400" aria-hidden="true" />
              Only workspace admins can view this response.
            </div>
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
