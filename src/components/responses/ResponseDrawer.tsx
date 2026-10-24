'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  LockKeyhole,
  Maximize2,
  Minimize2,
  Trash2,
  X,
} from 'lucide-react';
import { isAxiosError } from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Menu } from '@/components/ui/Menu';
import { Tabs } from '@/components/ui/Tabs';
import type { ReportFormat } from '@/types/report';
import { SubmittedResponse } from './SubmittedResponse';
import { ResponseSearch } from './ResponseViewControls';
import { useSubmittedResponse } from '@/hooks/useSubmittedResponse';
import { StageBadge } from './StageBadge';
import { NotesPanel } from './NotesPanel';
import { WorkflowSidebar } from './WorkflowSidebar';
import { responsesService } from '@/services/responses';
import { formAccessService } from '@/services/formAccess';
import { notesService } from '@/services/notes';
import { FormAccessPanel } from '@/components/team/FormAccessPanel';
import { formsService } from '@/services/forms';
import { tagsService } from '@/services/tags';
import { reportsService } from '@/services/reports';
import { useInboxMutations } from '@/hooks/useInboxMutations';
import { useMembers } from '@/hooks/useMembers';
import { useTags } from '@/hooks/useTags';
import { useAuth } from '@/hooks/useAuth';
import { useDesktop } from '@/hooks/useDesktop';
import { formAccessKeys, noteKeys, responseKeys, tagKeys, workspaceKeys } from '@/lib/queryKeys';
import type { Tag } from '@/types/tag';
import { detectRespondentIdentity, initialsOf, shortId } from '@/lib/formatters';
import { exportPayloadFromTarget } from '@/lib/reportExport';
import { buildAnswerItems } from '@/lib/responseAnswers';
import { DELETE_COPY, DOWNLOAD_FAILED, DOWNLOAD_QUEUED } from '@/lib/responseCopy';
import { hasCapability } from '@/lib/roles';
import { cn } from '@/lib/utils';
import { useRespondentFrom } from './RespondentFromContext';
import { workspacesService } from '@/services/workspaces';
import type { ResponseDetail } from '@/types/response';
import type { StageRef } from '@/types/stage';

interface ResponseDrawerProps {
  responseId: string | null;
  /** Undefined on the all-forms view — invalidations target the workspace-wide 'all' cache key. */
  formId?: string;
  /** Workspace slug, or 'personal' (OQ-1). */
  scope?: string;
  stages?: readonly StageRef[];
  formTitle?: string;
  /** Fallback labels for uploaded files, used only if the drawer cannot load the form definition (which it normally does itself). */
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
  /** Navigates to another response by id — wired to the duplicate callout's "view original" link
   * (task 5.5). Optional: a caller with no cross-response navigation (e.g. the standalone
   * `/responses/[id]` page) simply doesn't render the callout's link as clickable-elsewhere. */
  onOpenResponse?: (id: string) => void;
}

type PageTab = 'response' | 'details' | 'notes' | 'activity';

// Keys that are never a shortcut: anything typed into a field, and any chord with a modifier.
const isTypingTarget = (el: EventTarget | null): boolean =>
  el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));

function DrawerSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4" aria-busy="true">
      <div className="h-40 bg-(--bg-subtle) border border-(--border-default) rounded-lg animate-pulse" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2 p-4 bg-(--surface-card) border border-(--border-default) rounded-lg">
          <div className="h-4 w-32 bg-(--bg-subtle) rounded animate-pulse" />
          <div className="h-4 w-full max-w-sm bg-(--bg-subtle) rounded animate-pulse" />
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
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-(--error-surface) text-(--error-text)">
        <Icon size={24} aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <h3 className="bg-body font-semibold text-(--text-primary)">{heading}</h3>
        <p className="max-w-[42ch] bg-body-sm text-(--text-muted)">{body}</p>
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
  onOpenResponse,
}: ResponseDrawerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const drawerRef = useRef<HTMLDivElement>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [pageTab, setPageTab] = useState<PageTab>('response');
  const isDesktop = useDesktop();
  const respondentFrom = useRespondentFrom();
  const { user } = useAuth();
  const mutations = useInboxMutations({ scope, formId });
  const { data: members = [] } = useMembers(scope === 'personal' ? undefined : scope);
  const { data: tags = [] } = useTags(scope === 'personal' ? undefined : scope);

  // Same "resolve by slug from the already-cached workspace list" pattern useWorkspaceRole uses —
  // cheap (staleTime 5 min, shared cache key), and the notes panel's privacy sentence is the only
  // thing here that needs a display name, not a role.
  const { data: workspaces } = useQuery({
    queryKey: workspaceKeys.list(),
    queryFn: () => workspacesService.list(),
    enabled: scope !== 'personal',
    staleTime: 5 * 60_000,
  });
  const workspaceName = scope === 'personal' ? 'your workspace' : (workspaces?.find((w) => w.slug === scope)?.name ?? 'this workspace');
  const role = scope === 'personal' ? 'owner' : workspaces?.find((w) => w.slug === scope)?.role;
  const canDeleteAnyNote = role !== undefined && hasCapability(role, 'responses:delete');
  const canCreateTag = role !== undefined && hasCapability(role, 'responses:act');

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
  //
  // Two effects with narrow dependencies on purpose. This used to be one effect that also depended on `onClose`, which
  // the parent re-creates on every render: so it re-ran constantly, re-captured "the opener" as whatever was focused INSIDE
  // the drawer (gone by the time it closed), and pulled focus back to the first button each time. Result: Esc left focus
  // on <body> (QA A6-011). Now the opener is captured once when the drawer opens and restored once when it closes.
  const isDrawerOpen = !!responseId && displayMode !== 'page';
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const focusableSelector = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
  // Only controls that are actually on screen. The mobile-only "Back" button is first in the DOM but display:none on desktop:
  // focus() on it silently does nothing, so focus stayed on the row behind the drawer, and the Tab trap treated it as an edge
  // (QA D5-005, found by inspecting the live page). checkVisibility() sees hidden ancestors too; an environment without it
  // (an old browser, jsdom) counts everything as visible.
  const getFocusable = () =>
    Array.from(drawerRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? []).filter((el) => el.checkVisibility?.() ?? true);

  useEffect(() => {
    if (!isDrawerOpen) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // Focus moves into the drawer: its first control if the content is already there, else the drawer itself (it is
    // focusable), so a keyboard user never stays on the row behind the overlay while the response is still loading (QA D5-005).
    (getFocusable()[0] ?? drawerRef.current)?.focus();
    return () => {
      // The opener can have been re-rendered away (a list refetch); then there is nothing to return to.
      if (opener?.isConnected) opener.focus();
    };
  }, [isDrawerOpen]);

  useEffect(() => {
    if (!isDrawerOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Something inside (a popover, a menu, the search, an image viewer) already used this Escape and said so with preventDefault: only
        // that closes. stopPropagation cannot say it, because React and this listener both sit on the document, so the order they run
        // in decided whether the drawer closed too (it did, now and then, in a production build).
        if (e.defaultPrevented) return;
        onCloseRef.current();
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
  }, [isDrawerOpen]);

  // j / k: next and previous response, like a mail list. Never while typing, never with a modifier, and not while a
  // dialog (image viewer, delete confirmation) sits on top.
  const navRef = useRef({ onPrevious, onNext, hasPrevious, hasNext });
  useEffect(() => {
    navRef.current = { onPrevious, onNext, hasPrevious, hasNext };
  }, [onPrevious, onNext, hasPrevious, hasNext]);
  useEffect(() => {
    if (!responseId) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.key !== 'j' && e.key !== 'k') || e.ctrlKey || e.metaKey || e.altKey || isTypingTarget(e.target)) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]:not([aria-labelledby="drawer-title"])')) return;
      const { onPrevious: prev, onNext: next, hasPrevious: canPrev, hasNext: canNext } = navRef.current;
      if (e.key === 'j' && canNext) next?.();
      if (e.key === 'k' && canPrev) prev?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [responseId]);

  const { data: response, error: responseError, isError, isFetching, isLoading, refetch } = useQuery({
    queryKey: responseKeys.detail(scope, responseId ?? ''),
    queryFn: () => responsesService.getResponseById(responseId as string, scope),
    enabled: !!responseId,
  });

  // Collaboration (internal notes, assignee, activity) only means something when more than one
  // person is involved. Always on in a workspace; in a personal space only once the form is shared
  // with someone (a grant), or if notes already exist (never hide data, e.g. a form that was shared
  // and later unshared). While that is still being worked out the sections stay hidden rather than
  // flashing in and out, and a failed lookup fails open (shown) so nothing is hidden by mistake.
  const isPersonal = scope === 'personal';
  const grantFormId = formId ?? response?.formId;
  const grantsQuery = useQuery({
    queryKey: formAccessKeys.grants(grantFormId ?? ''),
    queryFn: () => formAccessService.listGrants(grantFormId as string),
    enabled: isPersonal && !!grantFormId && !!responseId,
    retry: false,
  });
  const personalNotesQuery = useQuery({
    queryKey: noteKeys.list(scope, responseId ?? ''),
    queryFn: () => notesService.list(responseId as string, scope),
    enabled: isPersonal && !!responseId,
    retry: false,
  });
  const showCollaboration =
    !isPersonal ||
    grantsQuery.isError ||
    (grantsQuery.data?.length ?? 0) > 0 ||
    (personalNotesQuery.data?.length ?? 0) > 0;
  const collaborationSettled = !isPersonal || grantsQuery.isSuccess || grantsQuery.isError;

  // The form definition tells the drawer each answer's field type and its Display & Preview settings
  // (image position/ratio/size, link style, currency…), so every answer renders as the form's owner chose.
  const { data: responseForm, isLoading: formLoading } = useQuery({
    queryKey: ['form', response?.formId],
    queryFn: () => formsService.getFormById(response?.formId as string),
    enabled: !!response?.formId,
  });

  // A failed/absent form lookup falls back to plain label → value rows rather than blocking the answers.
  const answerItems = response ? buildAnswerItems(response.answers, response.responseFiles, responseForm?.fields, responseForm?.pages, fileFieldLabels) : [];
  // The layout choice, the search and the arranged answers are shared by the toolbar under the header and the card below it.
  const sr = useSubmittedResponse({ responseId, formId: formId ?? response?.formId, scope, items: answerItems, hasSchema: !!responseForm?.fields });

  // Opening a response marks it read for the caller via an explicit request (design.md §11.2:
  // "GET never mutates") — never as a side effect of the detail fetch above. Runs once per
  // responseId, and only when the response is actually known unread (an absent `unread` field
  // defaults to "already read", matching IResponse's own documented convention).
  const markedReadRef = useRef<string | null>(null);
  useEffect(() => {
    if (!response || markedReadRef.current === response._id) return;
    markedReadRef.current = response._id;
    if (response.unread) mutations.markRead(response._id, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response?._id, response?.unread]);

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

  const createTagMutation = useMutation({
    mutationFn: (name: string) => tagsService.create(scope, { name, colour: 'neutral' }),
    onSuccess: (tag) => {
      // Put the new tag in the cached library right away (it is cached for minutes), then refresh it: the picker and every other list
      // of tags see it without a reload (QA D8-009).
      queryClient.setQueryData<Tag[]>(tagKeys.list(scope), (old) => (old && !old.some((t) => t.id === tag.id) ? [...old, tag] : old));
      void queryClient.invalidateQueries({ queryKey: tagKeys.list(scope) });
      if (response) mutations.updateTags(response._id, [...(response.tags ?? []).map((t) => t.id), tag.id]);
    },
    onError: () => toast('Failed to create tag. Please try again.', 'error'),
  });

  function downloadResponse(format: ReportFormat) {
    if (!response) return;
    // Response-level "Download" — single-response export through the export path, without notes
    // (requirements.md §9.3/B4.16); reuses the same `exportPayloadFromTarget` the Inbox's own
    // Export/BulkActionBar already build from, rather than a bespoke download call. The person picks the format
    // (CSV or PDF, the two the Exports page offers) from the Download menu.
    reportsService
      .createReport(exportPayloadFromTarget(format, { ids: [response._id] }), scope)
      .then(() => toast(DOWNLOAD_QUEUED, 'success'))
      .catch(() => toast(DOWNLOAD_FAILED, 'error'));
  }

  if (!responseId) return null;

  const identity = response ? detectRespondentIdentity(response.answers, responseForm?.fields, response.respondentEmail, respondentFrom) : {};
  const hasIdentity = !!(identity.label || identity.email);
  const initial = initialsOf(identity.label ?? identity.email).charAt(0) || '?';
  // Presentation only - the server enforces who may set the form-wide default.
  const canSetFormDefault = role !== undefined && hasCapability(role, 'forms:edit');

  const renderSidebar = (r: ResponseDetail, only?: 'details' | 'notes' | 'activity') => (
    <WorkflowSidebar
      response={r}
      scope={scope}
      stages={stages}
      tags={tags}
      members={members}
      collaboration={showCollaboration}
      only={only}
      notes={
        showCollaboration ? (
          <NotesPanel
            responseId={r._id}
            scope={scope}
            workspaceName={workspaceName}
            currentUserId={user?.id ?? ''}
            canDeleteAny={canDeleteAnyNote}
          />
        ) : undefined
      }
      onShare={isPersonal && collaborationSettled && !showCollaboration && grantFormId ? () => setShareOpen(true) : undefined}
      canCreateTag={canCreateTag}
      canScore={canCreateTag}
      isUpdating={mutations.isUpdating}
      onOpenOriginal={onOpenResponse}
      onStageChange={(stageId) => mutations.updateStage(r._id, stageId)}
      onAssigneeChange={(assigneeId) => mutations.updateAssignee(r._id, assigneeId)}
      onTagAdd={(tagId) => mutations.updateTags(r._id, [...(r.tags ?? []).map((t) => t.id), tagId])}
      onTagRemove={(tagId) => mutations.updateTags(r._id, (r.tags ?? []).map((t) => t.id).filter((id) => id !== tagId))}
      onTagCreate={(name) => createTagMutation.mutate(name)}
    />
  );

  // Below 1024px the full page moves the panels under the header as tabs.
  const pageTabs: { id: PageTab; label: string }[] = [
    { id: 'response', label: 'Response' },
    { id: 'details', label: 'Details' },
    ...(showCollaboration ? [{ id: 'notes' as const, label: 'Notes' }, { id: 'activity' as const, label: 'Activity' }] : []),
  ];
  const activeTab = pageTabs.some((t) => t.id === pageTab) ? pageTab : 'response';
  // The search only makes sense where the answers are on screen.
  const showSearch = !!response && !isError && (displayMode === 'drawer' || isDesktop || activeTab === 'response');

  const renderBody = (r: ResponseDetail) => {
    const card = <SubmittedResponse sr={sr} responseId={r._id} scope={scope} loading={formLoading} canSetFormDefault={canSetFormDefault} />;

    if (displayMode === 'drawer') {
      return (
        <div className="grid gap-4 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)]">
          {card}
          {renderSidebar(r)}
        </div>
      );
    }

    // Full screen, 1024px and up: the same two columns as the drawer - the response card takes the width, the overview sits beside it.
    if (isDesktop) {
      return (
        <div className="grid w-full items-start gap-6 grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)]">
          {card}
          {renderSidebar(r)}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-4">
        <Tabs ariaLabel="Response sections" tabs={pageTabs} activeId={activeTab} onChange={(id) => setPageTab(id as PageTab)} panelId="response-tabpanel" />
        <div role="tabpanel" id="response-tabpanel" aria-labelledby={`tab-${activeTab}`} className="min-w-0">
          {activeTab === 'response' ? card : renderSidebar(r, activeTab)}
        </div>
      </div>
    );
  };

  return (
    <div
      role={displayMode === 'drawer' ? 'presentation' : undefined}
      className={cn(
        displayMode === 'drawer'
          ? 'bg-scrim justify-end p-0'
          // Bug fix, Sprint 12 close-out: this set its own max-w-6xl cap, directly against
          // CLAUDE.md's "pages never set their own width" rule (AppShell already owns that) —
          // the full-page view read as a slightly-wider card, not an actual full-screen view.
          : 'flex min-h-[calc(100vh-104px)] w-full animate-fade-in'
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
        tabIndex={-1}
        className={cn(
          'relative flex w-full flex-col',
          displayMode === 'drawer'
            ? 'h-full overflow-hidden border border-y-0 border-r-0 border-(--border-default) bg-(--surface-card) shadow-(--shadow-lg) animate-slide-in-right lg:w-[80vw] lg:max-w-[1600px]'
            // The full page is not a box: the header sits flat on the page, and the response card and the overview are the only
            // cards, filling the width AppShell gives the page exactly as the drawer does. Nothing here clips overflow, so the card's
            // toolbar sticks to the page's own scroll.
            : 'gap-5'
        )}
      >
        {/* Below 640px the six action buttons (about 290px) left the name almost no room, so the header wraps: the respondent's name gets its own row and the actions sit under it. */}
        <header className={cn('flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-(--border-default)', displayMode === 'drawer' ? 'px-4 py-3 sm:px-6' : 'pb-4')}>
          <div className="flex min-w-0 items-center gap-3 max-sm:basis-full">
            {/* Full-screen sheet with a back chevron below 768px (requirements.md §9.1) — the
                close/back control is the same handler either way, only the icon changes. */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Back"
              className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md text-(--text-muted) hover:bg-(--surface-hover) hover:text-(--text-primary) max-md:flex md:hidden"
            >
              <ChevronLeft size={18} />
            </button>
            {response && hasIdentity && (
              <span
                aria-hidden="true"
                className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--accent-soft-hover) bg-body-sm font-semibold text-(--accent-soft-text) sm:flex"
              >
                {initial}
              </span>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 id="drawer-title" className="truncate bg-h5 text-(--text-primary)">
                  {response ? (identity.label ?? identity.email ?? `Response ${response.reference ?? `#${shortId(response._id)}`}`) : 'Response Details'}
                </h2>
                {response && <StageBadge stage={response.stage} status={response.status} />}
              </div>
              {response && (
                <p className="flex min-w-0 items-center gap-1 truncate bg-body-sm text-(--text-muted)">
                  <span className="truncate">{formTitle ?? responseForm?.title ?? ''}</span>
                  {identity.email && identity.label ? ` · ${identity.email}` : ''}
                </p>
              )}
              {/* "Edited after review" indicator — Sprint 13 (A5.2), space reserved, not built. */}
            </div>
          </div>
          {/* Search sits in the top bar, between the name and the actions; below 640px it takes its own row under the name. The action buttons keep their words only from 1536px: the drawer is 80% of the screen, and with the search here the words no longer fit before that. */}
          {showSearch && response && (
            <ResponseSearch
              sr={sr}
              responseId={response._id}
              className="min-w-40 flex-1 sm:max-w-xs max-sm:order-last max-sm:basis-full"
            />
          )}
          <div className="flex shrink-0 items-center gap-1.5 max-sm:ml-auto">
            {position !== undefined && totalResponses !== undefined && (
              <div className="flex items-center gap-1">
                <Button
                  variant="secondary"
                  size="small"
                  onClick={onPrevious}
                  disabled={!hasPrevious}
                  className="gap-1 px-2"
                  aria-label="Previous response"
                  title="Previous response (k)"
                >
                  <ChevronLeft size={14} aria-hidden="true" />
                  <span className="hidden 2xl:inline">Previous</span>
                </Button>
                <span className="hidden min-w-16 px-1 text-center bg-body-sm text-(--text-muted) md:inline">
                  {position} of {totalResponses}
                </span>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={onNext}
                  disabled={!hasNext}
                  className="gap-1 px-2"
                  aria-label="Next response"
                  title="Next response (j)"
                >
                  <span className="hidden 2xl:inline">Next</span>
                  <ChevronRight size={14} aria-hidden="true" />
                </Button>
              </div>
            )}
            {response && (
              <>
                <Menu
                  align="end"
                  triggerLabel="Download response"
                  triggerClassName="bg-btn bg-btn-ghost bg-btn-sm gap-1.5"
                  trigger={
                    <>
                      <Download size={15} aria-hidden="true" />
                      <span className="hidden 2xl:inline">Download</span>
                      <ChevronDown size={13} aria-hidden="true" />
                    </>
                  }
                  items={[
                    { id: 'csv', label: 'Download as CSV', icon: <FileSpreadsheet size={15} />, onSelect: () => downloadResponse('csv') },
                    { id: 'pdf', label: 'Download as PDF', icon: <FileText size={15} />, onSelect: () => downloadResponse('pdf') },
                  ]}
                />
                <Button variant="ghost" size="small" onClick={() => setConfirmDeleteOpen(true)} aria-label="Delete response" className="gap-1.5 text-(--error-text)">
                  <Trash2 size={15} aria-hidden="true" />
                  <span className="hidden 2xl:inline">Delete</span>
                </Button>
              </>
            )}
            {displayMode === 'drawer' && onExpand && (
              <button
                type="button"
                onClick={() => response && onExpand(response)}
                aria-label="Open response in full page"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-md border border-(--border-default) text-(--text-muted) hover:bg-(--surface-hover) hover:text-(--text-primary)"
              >
                <Maximize2 size={17} aria-hidden="true" />
              </button>
            )}
            {displayMode === 'page' && collapseHref ? (
              <a
                href={collapseHref}
                aria-label="Return to response drawer"
                className="hidden min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md text-(--text-muted) hover:bg-(--surface-hover) hover:text-(--text-primary) md:flex"
              >
                <Minimize2 size={18} />
              </a>
            ) : (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="hidden min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md text-(--text-muted) hover:bg-(--surface-hover) hover:text-(--text-primary) md:flex"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </header>

        <div className={cn('flex-1', displayMode === 'drawer' && 'overflow-y-auto')}>
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
            renderBody(response)
          )}
        </div>
      </div>

      {isPersonal && grantFormId && (
        <FormAccessPanel
          isOpen={shareOpen}
          formId={grantFormId}
          formTitle={formTitle ?? responseForm?.title ?? 'this form'}
          onClose={() => setShareOpen(false)}
        />
      )}

      <Modal
        isOpen={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        title="Delete this response?"
        description={DELETE_COPY.single}
      >
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-(--border-default)">
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
