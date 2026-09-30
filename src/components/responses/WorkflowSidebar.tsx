'use client';

import { CalendarDays, Hash, Shield } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { AssigneePicker } from './AssigneePicker';
import { TagPicker } from './TagPicker';
import { ActivityTimeline } from './ActivityTimeline';
import { DuplicateCallout } from './DuplicateCallout';
import { activityService } from '@/services/activity';
import { responseActivityKeys } from '@/lib/queryKeys';
import { formatResponseDate, shortId } from '@/lib/formatters';
import type { ResponseDetail } from '@/types/response';
import type { StageRef } from '@/types/stage';
import type { Tag } from '@/types/tag';
import type { MemberListItem } from '@/types/team';

export interface WorkflowSidebarProps {
  response: ResponseDetail;
  scope: string;
  stages: readonly StageRef[];
  tags: readonly Tag[];
  members: readonly MemberListItem[];
  /** OQ-5 default: any `responses:act` role may create a tag inline from this picker — distinct
   * from `tags:manage` (Owner/Admin), which gates the full Settings tag manager (task 2.5). */
  canCreateTag: boolean;
  onStageChange: (stageId: string) => void;
  onAssigneeChange: (assigneeId: string | null) => void;
  onTagAdd: (tagId: string) => void;
  onTagRemove: (tagId: string) => void;
  onTagCreate: (name: string) => void;
  isUpdating?: boolean;
  /** Wired to the duplicate callout's "view original" link (task 5.5). Undefined = no
   * cross-response navigation available from this caller. */
  onOpenOriginal?: (id: string) => void;
}

const SECTION_LABEL = 'text-caption font-semibold text-(--text-muted) uppercase tracking-wide';
const META_ROW = 'flex items-center justify-between gap-3 py-2 border-b border-(--border-default) last:border-0 last:pb-0';
const META_LABEL = 'flex items-center gap-1.5 shrink-0 text-caption text-(--text-muted)';

const ORIGIN_TOOLTIP = 'Anonymised origin hash — raw IPs are never stored.';

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
  canCreateTag,
  onStageChange,
  onAssigneeChange,
  onTagAdd,
  onTagRemove,
  onTagCreate,
  isUpdating,
  onOpenOriginal,
}: WorkflowSidebarProps) {
  const { data: activity, isLoading: activityLoading, isError: activityError, refetch: refetchActivity } = useQuery({
    queryKey: responseActivityKeys.list(scope, response._id),
    queryFn: () => activityService.list(response._id, scope),
  });

  const ipHash = response.ipHash ? response.ipHash.slice(0, 16) : null;

  return (
    <aside className="flex w-full shrink-0 flex-col gap-4 lg:max-w-65">
      {response.duplicateOfId && onOpenOriginal && (
        <DuplicateCallout
          duplicateOfId={response.duplicateOfId}
          scope={scope}
          onOpenOriginal={onOpenOriginal}
        />
      )}

      <Card className="flex flex-col gap-3">
        <div>
          <span id="workflow-stage-label" className={SECTION_LABEL}>Stage</span>
          <Select
            id="workflow-stage-select"
            aria-labelledby="workflow-stage-label"
            value={response.stage?.id ?? ''}
            disabled={isUpdating || stages.length === 0}
            onChange={(e) => onStageChange(e.target.value)}
            className="mt-1"
          >
            {!response.stage && <option value="">Unknown stage</option>}
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>{stage.name}</option>
            ))}
          </Select>
        </div>

        <div>
          <span className={SECTION_LABEL}>Assignee</span>
          <div className="mt-1">
            <AssigneePicker members={members} current={response.assignee} onChange={onAssigneeChange} disabled={isUpdating} />
          </div>
        </div>

        <div>
          <span className={SECTION_LABEL}>Tags</span>
          <div className="mt-1">
            <TagPicker
              available={tags}
              selectedIds={response.tags.map((t) => t.id)}
              canCreate={canCreateTag}
              disabled={isUpdating}
              onAdd={onTagAdd}
              onRemove={onTagRemove}
              onCreate={onTagCreate}
            />
          </div>
        </div>

        {/* Score — Sprint 13/Phase 5 (blocked on OQ-7, cuttable). Deliberately not built; this is
            the reserved slot design.md §15 names ("Score" between Tags and Submission metadata). */}
      </Card>

      <Card className="flex flex-col gap-3">
        <span className={SECTION_LABEL}>Submission</span>
        <div className="flex flex-col">
          <div className={META_ROW}>
            <span className={META_LABEL}>
              <CalendarDays size={13} aria-hidden="true" />
              Date
            </span>
            <span className="text-body-sm text-(--text-secondary) text-right">{formatResponseDate(response.submittedAt)}</span>
          </div>
          <div className={META_ROW}>
            <span className={META_LABEL} title={ORIGIN_TOOLTIP}>
              <Shield size={13} aria-hidden="true" />
              Origin
            </span>
            <code title={ORIGIN_TOOLTIP} className="font-mono text-caption text-(--text-muted) break-all text-right">
              {ipHash ?? '—'}
            </code>
          </div>
          <div className={META_ROW}>
            <span className={META_LABEL}>
              <Hash size={13} aria-hidden="true" />
              Reference
            </span>
            <code className="font-mono text-caption text-(--text-muted)">{response.reference ?? shortId(response._id)}</code>
          </div>
        </div>
      </Card>

      <Card className="flex flex-col gap-3">
        <span className={SECTION_LABEL}>Activity</span>
        <ActivityTimeline entries={activity} isLoading={activityLoading} isError={activityError} onRetry={() => void refetchActivity()} />
      </Card>
    </aside>
  );
}
