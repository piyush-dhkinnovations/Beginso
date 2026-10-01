'use client';

import { useState } from 'react';
import { Table, type TableColumn } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ROLE_LABELS } from '@/lib/roles';
import type { PendingInvitation } from '@/types/team';

export interface PendingInvitesTableProps {
  invitations: PendingInvitation[];
  canManage: boolean;
  isLoading?: boolean;
  onResend: (invitation: PendingInvitation) => void;
  onRevoke: (invitation: PendingInvitation) => void;
}

// Presentational — same split as MemberTable (design.md §6/§7): no fetching, no mutation calls.
// Resend/Revoke are hidden entirely (not just disabled) for a caller without manage permission
// (requirements.md §7.3) — Revoke opens a focus-trapped confirmation modal, not window.confirm().
export function PendingInvitesTable({ invitations, canManage, isLoading, onResend, onRevoke }: PendingInvitesTableProps) {
  const [pendingRevoke, setPendingRevoke] = useState<PendingInvitation | null>(null);

  const columns: TableColumn<PendingInvitation>[] = [
    { key: 'email', header: 'Email', render: (i) => <span className="bg-body-sm font-medium">{i.email}</span> },
    { key: 'role', header: 'Role', render: (i) => <Badge variant="outline">{ROLE_LABELS[i.role]}</Badge> },
    {
      key: 'createdAt',
      header: 'Sent',
      render: (i) => <span className="bg-body-sm text-(--text-muted)">{new Date(i.createdAt).toLocaleDateString()}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (i) => {
        if (!canManage) return null;
        return (
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              aria-label={`Resend invite to ${i.email}`}
              onClick={() => onResend(i)}
              className="bg-body-sm font-medium text-(--accent-soft-text) hover:underline"
            >
              Resend
            </button>
            <button
              type="button"
              aria-label={`Revoke invite to ${i.email}`}
              onClick={() => setPendingRevoke(i)}
              className="bg-body-sm font-medium text-(--error-text) hover:underline"
            >
              Revoke
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      {/* No zero-items empty state card here (requirements.md §7.3's own table is secondary to
          Members) — an empty invitations list simply renders as a table with no rows, which
          would read as a dashed full-width empty state competing with the Members card above it
          if one were added (design.md §17). */}
      <Table columns={columns} rows={invitations} rowKey={(i) => i.id} isLoading={isLoading} skeletonRows={2} />

      <Modal
        isOpen={pendingRevoke !== null}
        onClose={() => setPendingRevoke(null)}
        title="Revoke invitation?"
        description={pendingRevoke ? `The invite sent to ${pendingRevoke.email} will no longer be usable.` : undefined}
      >
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-(--border-default)">
          <Button type="button" variant="secondary" onClick={() => setPendingRevoke(null)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              if (pendingRevoke) onRevoke(pendingRevoke);
              setPendingRevoke(null);
            }}
          >
            Revoke
          </Button>
        </div>
      </Modal>
    </>
  );
}
