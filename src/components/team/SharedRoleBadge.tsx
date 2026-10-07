import { Eye, Pencil } from 'lucide-react';
import { Badge, type BadgeProps } from '@/components/ui/Badge';
import { ROLE_LABELS } from '@/lib/roles';
import type { SharedFormItem } from '@/types/team';

type SharedRole = SharedFormItem['role'];

// Reviewer/viewer read, editor/member write — the icon says which at a glance, the colour tells
// the roles apart. Roles beyond these (admin) fall back to a plain outline pill.
const LOOK: Partial<Record<SharedRole, { variant: BadgeProps['variant']; icon: typeof Eye }>> = {
  viewer: { variant: 'info', icon: Eye },
  reviewer: { variant: 'info', icon: Eye },
  member: { variant: 'primary', icon: Pencil },
  editor: { variant: 'primary', icon: Pencil },
};

export function SharedRoleBadge({ role }: { role: SharedRole }) {
  const look = LOOK[role];
  const Icon = look?.icon;
  return (
    <Badge variant={look?.variant ?? 'outline'} pill>
      {Icon && <Icon size={13} aria-hidden="true" />}
      {ROLE_LABELS[role]}
    </Badge>
  );
}
