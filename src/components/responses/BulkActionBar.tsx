'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Menu, type MenuItem } from '@/components/ui/Menu';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { hasCapability, canActOnResponses } from '@/lib/roles';
import type { StageRef } from '@/types/stage';
import type { Tag } from '@/types/tag';
import type { MemberListItem } from '@/types/team';
import type { Role } from '@/types/workspace';
import type { BulkAction, BulkTarget, ResponseFilters } from '@/types/response';

export interface BulkActionBarProps {
  selectedIds: string[];
  /** True once the caller chose "Select all N matching" — bulk actions then target the active
   * filter, not the loaded page's ids (requirements.md §7.2: "sent as a filter, never as N
   * ids"). */
  selectAllMatching: boolean;
  /** Total responses the active filter matches (server `total`) — undefined while unknown. */
  totalMatching?: number;
  onToggleSelectAllMatching: (on: boolean) => void;
  filters: ResponseFilters;
  formId?: string;
  stages: readonly StageRef[];
  tags?: readonly Tag[];
  /** Undefined in the personal shell — assignment has no meaning there (OQ-9). */
  members?: readonly MemberListItem[];
  role: Role | undefined;
  isLoading: boolean;
  onBulk: (target: BulkTarget, action: BulkAction) => void;
  onDeleteRequest: (target: BulkTarget, count: number) => void;
  onExport: (target: BulkTarget) => void;
  onClear: () => void;
}

/**
 * Sprint 12 (inbox-collaboration), requirements.md §7.5 (5.1), design.md §15. Rebuild (task 2.4):
 * replaces yesterday's minimal stage-only stopgap. Role-gated actions are omitted, not disabled
 * (a hidden `stages:manage`-style capability check would be misleading here — the gate is
 * `responses:act`/`responses:delete`/`responses:export`, requirements.md §14's table). "Select
 * all N matching" sends `{ filter }`, never N ids. Delete keeps its confirm modal (owned by the
 * caller via `onDeleteRequest`) but now offers Undo via the bulk endpoint's `previous` snapshot
 * (OQ-3 resolved in favour of reversible delete, BE 0.2 building soft delete against this
 * contract) — the Undo toast itself is `useInboxMutations.bulk`'s job, not this component's.
 */
export function BulkActionBar({
  selectedIds,
  selectAllMatching,
  totalMatching,
  onToggleSelectAllMatching,
  filters,
  formId,
  stages,
  tags = [],
  members,
  role,
  isLoading,
  onBulk,
  onDeleteRequest,
  onExport,
  onClear,
}: BulkActionBarProps) {
  const [pendingTagId, setPendingTagId] = useState('');
  const [pendingAssigneeId, setPendingAssigneeId] = useState('');

  const count = selectedIds.length;
  if (count === 0) return null;

  const canAct = canActOnResponses(role);
  const canDelete = role !== undefined && hasCapability(role, 'responses:delete');
  const canExport = role !== undefined && hasCapability(role, 'responses:export');

  const target: BulkTarget = selectAllMatching ? { filter: filters, formId } : { ids: selectedIds };
  const effectiveCount = selectAllMatching ? totalMatching ?? count : count;
  const canOfferSelectAllMatching =
    !selectAllMatching && totalMatching !== undefined && totalMatching > count;

  // Secondary actions collapse into one ui/Menu (requirements.md §10: "actions in a ui/Menu" on
  // mobile) — kept collapsed at every width rather than duplicating the control set per
  // breakpoint, the lazier option that still satisfies "reachable on mobile".
  const menuItems: MenuItem[] = [];
  if (canAct && members && members.length > 0) {
    menuItems.push({
      id: 'assign-unassigned',
      label: 'Unassign',
      onSelect: () => onBulk(target, { type: 'assign', assigneeId: null }),
    });
  }
  if (canAct) {
    menuItems.push(
      { id: 'mark-read', label: 'Mark read', onSelect: () => onBulk(target, { type: 'read' }) },
      { id: 'mark-unread', label: 'Mark unread', onSelect: () => onBulk(target, { type: 'unread' }) }
    );
  }
  if (canExport) {
    menuItems.push({ id: 'export', label: 'Export', onSelect: () => onExport(target) });
  }
  if (canDelete) {
    menuItems.push({
      id: 'delete',
      label: 'Delete',
      danger: true,
      onSelect: () => onDeleteRequest(target, effectiveCount),
    });
  }

  return (
    <div
      role="region"
      aria-label="Bulk actions"
      className="sticky bottom-0 z-10 flex flex-wrap items-center gap-3 px-4 py-2 bg-(--accent-soft) border border-(--border-default) rounded-lg mb-2"
    >
      <span className="text-body-sm font-medium text-(--accent-soft-text)" aria-live="polite">
        {effectiveCount} selected
      </span>

      {canOfferSelectAllMatching && (
        <button
          type="button"
          className="text-body-sm underline underline-offset-2 text-(--accent-soft-text)"
          onClick={() => onToggleSelectAllMatching(true)}
        >
          Select all {totalMatching} matching
        </button>
      )}

      <div className="flex flex-wrap items-center gap-2 ml-auto">
        {canAct && stages.length > 0 && (
          <Select
            id="bulk-change-stage"
            aria-label="Change stage for selected responses"
            disabled={isLoading}
            value=""
            onChange={(e) => {
              if (e.target.value) onBulk(target, { type: 'stage', stageId: e.target.value });
            }}
          >
            <option value="" disabled>Change stage…</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
        )}

        {canAct && members && members.length > 0 && (
          <Select
            id="bulk-assign"
            aria-label="Assign selected responses"
            disabled={isLoading}
            value={pendingAssigneeId}
            onChange={(e) => {
              setPendingAssigneeId(e.target.value);
              if (e.target.value) {
                onBulk(target, { type: 'assign', assigneeId: e.target.value });
                setPendingAssigneeId('');
              }
            }}
          >
            <option value="" disabled>Assign to…</option>
            {members.map((m) => (
              <option key={m.membershipId} value={m.membershipId}>{m.name}</option>
            ))}
          </Select>
        )}

        {canAct && tags.length > 0 && (
          <Select
            id="bulk-tag"
            aria-label="Add a tag to selected responses"
            disabled={isLoading}
            value={pendingTagId}
            onChange={(e) => {
              setPendingTagId(e.target.value);
              if (e.target.value) {
                onBulk(target, { type: 'tag', tagId: e.target.value });
                setPendingTagId('');
              }
            }}
          >
            <option value="" disabled>Add tag…</option>
            {tags.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </Select>
        )}

        {menuItems.length > 0 && (
          <Menu
            trigger={isLoading ? <LoadingSpinner variant="inline" /> : 'More'}
            triggerLabel="More bulk actions"
            triggerClassName="bg-btn bg-btn-secondary bg-btn-sm"
            items={menuItems}
            align="end"
          />
        )}

        <Button variant="ghost" size="small" onClick={onClear} disabled={isLoading}>
          Clear
        </Button>
      </div>
    </div>
  );
}
