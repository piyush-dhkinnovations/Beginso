'use client';

import { formatRelativeTime } from '@/lib/formatters';
import type { ReactNode } from 'react';
import { CalendarDays, Hash, Share2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { AssigneePicker } from './AssigneePicker';
import { TagPicker } from './TagPicker';
import { ActivityTimeline } from './ActivityTimeline';
import { DuplicateCallout } from './DuplicateCallout';
import { EditedAfterReviewCallout } from './EditedAfterReviewCallout';
import { ScoreCard } from '@/components/scoring/ScoreCard';
import { activityService } from '@/services/activity';
import { useScoreCriteria } from '@/hooks/useScoreCriteria';
import { responseActivityKeys } from '@/lib/queryKeys';
import { detectRespondentIdentity, formatResponseDate, shortId } from '@/lib/formatters';
import { useFormFields } from '@/hooks/useFormFields';
import type { ResponseDetail } from '@/types/response';
import { fallbackStageId } from '@/lib/bulkActions';
import type { StageRef } from '@/types/stage';
import type { Tag } from '@/types/tag';
import type { MemberListItem } from '@/types/team';

export interface WorkflowSidebarProps {
  response: ResponseDetail;
  scope: string;
  stages: readonly StageRef[];
  tags: readonly Tag[];
  members: readonly MemberListItem[];
  /** Assignee and Activity only make sense with more than one person involved — false hides them
   * (a personal form shared with nobody). Default true so every other caller is unchanged. */
  collaboration?: boolean;
  /** The internal-notes panel, rendered directly under the submission details (the drawer's right column order). */
  notes?: ReactNode;
  /** When set (solo personal form), shows a small "share this form" nudge that calls it. */
  onShare?: () => void;
  /** OQ-5 default: any `responses:act` role may create a tag inline from this picker — distinct
   * from `tags:manage` (Owner/Admin), which gates the full Settings tag manager (task 2.5). */
  canCreateTag: boolean;
  /** `responses:act` — gates the scorecard the same way `canCreateTag` gates the tag picker's
   * inline create (task 5.3). */
  canScore?: boolean;
  onStageChange: (stageId: string) => void;
  onAssigneeChange: (assigneeId: string | null) => void;
  onTagAdd: (tagId: string) => void;
  onTagRemove: (tagId: string) => void;
  onTagCreate: (name: string) => void;
  isUpdating?: boolean;
  /** Wired to the duplicate callout's "view original" link (task 5.5). Undefined = no
   * cross-response navigation available from this caller. */
  /** Lists every response from the same email address (the caller closes the drawer and fills in the search). */
  onSeeSimilar?: (email: string) => void;
  /** Render one part only (the full-screen page's tabs below 1024px). Undefined = everything, stacked. */
  only?: 'details' | 'notes' | 'activity';
}

const SECTION_LABEL = 'bg-body-sm font-semibold text-(--text-muted) uppercase tracking-wide';
const OVERVIEW_ROW = 'grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-3';
const OVERVIEW_LABEL = 'bg-body-sm text-(--text-muted)';
const META_ROW = 'flex items-center justify-between gap-3 py-2 border-b border-(--border-default) last:border-0 last:pb-0';
const META_LABEL = 'flex items-center gap-1.5 shrink-0 bg-body-sm text-(--text-muted)';

/**
 * Sprint 12 (inbox-collaboration), requirements.md §9.1, design.md §6/§7/§15. Replaces
 * `MetadataSidebar` — a component width (260px on desktop, per the wireframe), not a page width.
 * Every control writes through the caller's `useInboxMutations` handles (passed down as the
 * `on*Change`/`on*Add`/etc. props) so the Board/Table update without a manual refetch.
 */
export function WorkflowSidebar({
  response,
  scope,
  stages,
  tags,
  members,
  collaboration = true,
  notes,
  onShare,
  canCreateTag,
  canScore,
  onStageChange,
  onAssigneeChange,
  onTagAdd,
  onTagRemove,
  onTagCreate,
  isUpdating,
  onSeeSimilar,
  only,
}: WorkflowSidebarProps) {
  const { data: activity, isLoading: activityLoading, isError: activityError, refetch: refetchActivity } = useQuery({
    queryKey: responseActivityKeys.list(scope, response._id),
    queryFn: () => activityService.list(response._id, scope),
    // The Activity card is hidden for a solo personal form — don't fetch what nobody will see.
    enabled: collaboration,
    // Live like the notes: a teammate's stage change or assignment shows up without a reload.
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const { data: criteria = [], isLoading: criteriaLoading } = useScoreCriteria(scope);
  // The duplicate check compares the email address only, so that is what "similar" means here.
  const formFields = useFormFields(response.formId);
  const similarEmail = response.respondentEmail || detectRespondentIdentity(response.answers, formFields, response.respondentEmail).email || undefined;

  const showDetails = !only || only === 'details';
  const showNotes = !only || only === 'notes';
  const showActivity = !only || only === 'activity';

  return (
    <aside className="flex w-full min-w-0 flex-col gap-4">
      {showDetails && (<>
      {response.editedAfterReviewAt && (
        <EditedAfterReviewCallout
          responseId={response._id}
          editedAt={response.editedAfterReviewAt}
          scope={scope}
          canAct={canCreateTag}
        />
      )}

      {!response.editedAfterReviewAt && response.lastEditedByRespondentAt && (
        <p className="m-0 rounded-lg border border-(--border-default) bg-(--info-surface) px-3 py-2 bg-body-sm text-(--info-text)">
          <strong>Edited by the respondent</strong> {formatRelativeTime(response.lastEditedByRespondentAt)}. The answers shown are their latest.
        </p>
      )}

      {response.duplicateOfId && (
        <DuplicateCallout
          email={similarEmail}
          formId={response.formId}
          scope={scope}
          onSeeAll={(email) => onSeeSimilar?.(email)}
        />
      )}

      <Card className="flex flex-col gap-3">
        <h3 className="bg-body font-semibold text-(--text-primary)">Response overview</h3>
        <div className={OVERVIEW_ROW}>
          <span id="workflow-stage-label" className={OVERVIEW_LABEL}>Stage</span>
          <Select
            id="workflow-stage-select"
            aria-labelledby="workflow-stage-label"
            // Personal-shell responses never have a real `stage` (OQ-9 — no Stage document can
            // exist without a workspace) — `status` is the raw field there, and its value lines
            // up 1:1 with PERSONAL_DEFAULT_STAGES' synthetic ids, so it's the correct fallback
            // rather than always reading as "Unknown stage."
            value={response.stage?.id ?? (scope === 'personal' ? response.status ?? '' : fallbackStageId(stages, response.status))}
            disabled={isUpdating || stages.length === 0}
            onChange={(e) => onStageChange(e.target.value)}
          >
            {!response.stage && scope !== 'personal' && !fallbackStageId(stages, response.status) && <option value="">Unknown stage</option>}
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>{stage.name}</option>
            ))}
          </Select>
        </div>

        {collaboration && (
          <div className={OVERVIEW_ROW}>
            <span className={OVERVIEW_LABEL}>Assignee</span>
            <AssigneePicker members={members} current={response.assignee} onChange={onAssigneeChange} disabled={isUpdating} />
          </div>
        )}

        <div className={OVERVIEW_ROW}>
          <span className={OVERVIEW_LABEL}>Tags</span>
          <TagPicker
            available={tags}
            selectedIds={(response.tags ?? []).map((t) => t.id)}
            selectedTags={response.tags ?? []}
            canCreate={canCreateTag}
            disabled={isUpdating}
            onAdd={onTagAdd}
            onRemove={onTagRemove}
            onCreate={onTagCreate}
          />
        </div>

        {scope !== 'personal' && (criteriaLoading || criteria.length > 0) && (
          <div className={OVERVIEW_ROW}>
            <span className={OVERVIEW_LABEL}>Score</span>
            <ScoreCard responseId={response._id} criteria={criteria} disabled={!canScore} />
          </div>
        )}
      </Card>

      <Card className="flex flex-col gap-3">
        <h3 className="bg-body font-semibold text-(--text-primary)">Submission details</h3>
        <div className="flex flex-col">
          <div className={META_ROW}>
            <span className={META_LABEL}>
              <CalendarDays size={13} aria-hidden="true" />
              Submitted on
            </span>
            <span className="bg-body-sm text-(--text-secondary) text-right">{formatResponseDate(response.submittedAt)}</span>
          </div>
          <div className={META_ROW}>
            <span className={META_LABEL}>
              <Hash size={13} aria-hidden="true" />
              Reference ID
            </span>
            <code className="font-mono bg-body-sm text-(--text-muted)">{response.reference ?? shortId(response._id)}</code>
          </div>
        </div>
      </Card>
      </>)}

      {showNotes && notes}

      {showActivity && (collaboration ? (
        <Card className="flex flex-col gap-3">
          <span className={SECTION_LABEL}>Activity</span>
          <ActivityTimeline entries={activity} stages={stages} isLoading={activityLoading} isError={activityError} onRetry={() => void refetchActivity()} />
        </Card>
      ) : (
        onShare && (
          <Card className="flex flex-col gap-2">
            <span className={SECTION_LABEL}>Working with others?</span>
            <p className="bg-body-sm text-(--text-muted)">
              Share this form and your teammates can add notes, take responses and see the activity here.
            </p>
            <Button variant="secondary" size="small" onClick={onShare}>
              <Share2 size={14} className="mr-2" aria-hidden="true" />
              Share this form
            </Button>
          </Card>
        )
      ))}
    </aside>
  );
}
