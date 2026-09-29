'use client';

import { useState } from 'react';
import { Select } from '@/components/ui/Select';
import { Menu, type MenuItem } from '@/components/ui/Menu';
import { Alert } from '@/components/ui/Alert';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { staleFilterCount } from '@/lib/savedViewStaleness';
import type { SavedView } from '@/types/savedView';
import type { StageRef } from '@/types/stage';
import type { Tag } from '@/types/tag';
import type { MemberListItem } from '@/types/team';
import type { Role } from '@/types/workspace';

export interface SavedViewSelectProps {
  views: readonly SavedView[];
  currentUserId: string;
  activeViewId?: string;
  stages: readonly StageRef[];
  tags?: readonly Tag[];
  members?: readonly MemberListItem[];
  role: Role | undefined;
  onApply: (view: SavedView) => void;
  onClearApplied: () => void;
  onRename: (view: SavedView, name: string) => void;
  onDelete: (view: SavedView) => void;
}

function canManageView(view: SavedView, currentUserId: string, role: Role | undefined): boolean {
  return view.ownerId === currentUserId || role === 'owner' || role === 'admin';
}

/**
 * Sprint 12 (inbox-collaboration), requirements.md §7.6 (6.1), design.md §15. "My views"/"Team
 * views" in separate groups (native `<optgroup>` — no dependency needed for a grouped list).
 * Rename/delete restricted to the view's owner or Admin+ (design.md §11.3); Undo on delete is the
 * caller's job (`onDelete` — matches `useInboxMutations.bulk`'s own toast-with-Undo pattern, kept
 * out of this presentational component). A view referencing a deleted stage/tag/member shows the
 * inline "N filter(s) no longer exist" notice rather than erroring.
 */
export function SavedViewSelect({
  views,
  currentUserId,
  activeViewId,
  stages,
  tags = [],
  members = [],
  role,
  onApply,
  onClearApplied,
  onRename,
  onDelete,
}: SavedViewSelectProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const myViews = views.filter((v) => v.ownerId === currentUserId);
  const teamViews = views.filter((v) => v.ownerId !== currentUserId && v.visibility === 'team');
  const activeView = views.find((v) => v.id === activeViewId);

  if (views.length === 0 && !activeViewId) return null;

  const menuItems = (view: SavedView): MenuItem[] => {
    if (!canManageView(view, currentUserId, role)) return [];
    return [
      { id: 'rename', label: 'Rename', onSelect: () => { setRenamingId(view.id); setRenameValue(view.name); } },
      { id: 'delete', label: 'Delete', danger: true, onSelect: () => onDelete(view) },
    ];
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Select
          id="saved-view-select"
          aria-label="Saved views"
          value={activeViewId ?? ''}
          onChange={(e) => {
            if (!e.target.value) {
              onClearApplied();
              return;
            }
            const view = views.find((v) => v.id === e.target.value);
            if (view) onApply(view);
          }}
        >
          <option value="">All responses</option>
          {myViews.length > 0 && (
            <optgroup label="My views">
              {myViews.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </optgroup>
          )}
          {teamViews.length > 0 && (
            <optgroup label="Team views">
              {teamViews.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </optgroup>
          )}
        </Select>

        {activeView && (
          <Menu
            trigger="⋯"
            triggerLabel={`Manage the "${activeView.name}" saved view`}
            items={menuItems(activeView)}
          />
        )}
      </div>

      {renamingId === activeView?.id && activeView && (
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (renameValue.trim()) onRename(activeView, renameValue.trim());
            setRenamingId(null);
          }}
        >
          <Input id="rename-saved-view" aria-label="Rename saved view" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} autoFocus />
          <Button type="submit" size="small">Save</Button>
          <Button type="button" variant="ghost" size="small" onClick={() => setRenamingId(null)}>Cancel</Button>
        </form>
      )}

      {activeView && (() => {
        const stale = staleFilterCount(activeView.filters, stages, tags, members);
        if (stale === 0) return null;
        return (
          <Alert variant="info">
            {stale} filter{stale === 1 ? '' : 's'} no longer exist{stale === 1 ? 's' : ''}.
          </Alert>
        );
      })()}
    </div>
  );
}
