'use client';

import { useState } from 'react';
import { Table, type TableColumn } from '@/components/ui/Table';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { X } from 'lucide-react';
import { ROLE_LABELS } from '@/lib/roles';
import type { MemberListItem } from '@/types/team';
import type { Role } from '@/types/workspace';

export interface MemberTableProps {
  members: MemberListItem[];
  currentUserId: string;
  canManage: boolean;
  isLoading?: boolean;
  onRoleChange: (member: MemberListItem, role: Role) => void;
  onRemove: (member: MemberListItem) => void;
}

const ASSIGNABLE_ROLES: Exclude<Role, 'owner'>[] = ['admin', 'member', 'viewer'];

// Presentational — no fetching, no mutation calls (design.md §7). Owns row layout, per-row
// canManage gating, and the remove-confirmation modal's open/close state; the actual API calls
// are the parent page's job (design.md §8's data flow).
export function MemberTable({ members, currentUserId, canManage, isLoading, onRoleChange, onRemove }: MemberTableProps) {
  const [pendingRemoval, setPendingRemoval] = useState<MemberListItem | null>(null);

  const columns: TableColumn<MemberListItem>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (m) => (
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar name={m.name} src={m.avatarUrl ?? undefined} alt="" size="sm" />
          <span className="truncate font-medium text-body-sm">{m.name}</span>
        </div>
      ),
    },
    { key: 'email', header: 'Email', render: (m) => <span className="text-body-sm text-text-muted">{m.email}</span> },
    {
      key: 'role',
      header: 'Role',
      render: (m) => {
        // The Owner row renders role as a plain Badge, never editable — ownership only
        // transfers, never gets re-roled through this control (requirements.md §7.2).
        if (m.isOwner) return <Badge variant="neutral">{ROLE_LABELS[m.role]}</Badge>;
        if (!canManage) return <Badge variant="outline">{ROLE_LABELS[m.role]}</Badge>;
        return (
          <Select
            id={`role-select-${m.membershipId}`}
            aria-label={`Change role for ${m.name}`}
            value={m.role}
            onChange={(e) => onRoleChange(m, e.target.value as Role)}
          >
            {ASSIGNABLE_ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </Select>
        );
      },
    },
    {
      key: 'lastActive',
      header: 'Last active',
      render: (m) => (
        <span className="text-body-sm text-text-muted">
          {m.lastActiveAt ? new Date(m.lastActiveAt).toLocaleString() : '—'}
        </span>
      ),
    },
    {
      key: 'remove',
      header: '',
      align: 'right',
      render: (m) => {
        // Never shown on the Owner row, and never on the caller's own row (design.md §15.1's
        // region notes) — a manager doesn't remove themselves through this control.
        if (!canManage || m.isOwner || m.userId === currentUserId) return null;
        return (
          <Button
            type="button"
            variant="ghost"
            size="small"
            aria-label={`Remove ${m.name}`}
            onClick={() => setPendingRemoval(m)}
          >
            <X size={14} />
          </Button>
        );
      },
    },
  ];

  return (
    <>
      {/* No emptyState prop: a workspace always has >=1 member (its Owner), so the zero-rows
          branch is unreachable in practice (requirements.md §12) — a fetch failure is the
          parent page's job to render instead of this table entirely (design.md §7/§17). */}
      <Table
        columns={columns}
        rows={members}
        rowKey={(m) => m.membershipId}
        isLoading={isLoading}
        skeletonRows={4}
      />

      <Modal
        isOpen={pendingRemoval !== null}
        onClose={() => setPendingRemoval(null)}
        title="Remove member?"
        description={pendingRemoval ? `${pendingRemoval.name} will lose access to this workspace immediately.` : undefined}
      >
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-[var(--border-default)]">
          <Button type="button" variant="secondary" onClick={() => setPendingRemoval(null)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              if (pendingRemoval) onRemove(pendingRemoval);
              setPendingRemoval(null);
            }}
          >
            Remove
          </Button>
        </div>
      </Modal>
    </>
  );
}
