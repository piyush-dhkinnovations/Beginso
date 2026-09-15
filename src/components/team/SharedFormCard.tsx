import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Tag } from '@/components/ui/Tag';
import { Badge } from '@/components/ui/Badge';
import { ROLE_LABELS } from '@/lib/roles';
import { formatRelativeTime } from '@/lib/formatters';
import type { SharedFormItem } from '@/types/team';

export interface SharedFormCardProps {
  item: SharedFormItem;
}

// Presentational (design.md §6/§15.6) — form name, sharer, workspace/personal label, role Badge.
// Card click opens the form at whatever access level the grant allows (requirements.md §7.9);
// building a dedicated respondent/reviewer destination for a grant-only viewer doesn't exist yet
// this sprint, so this links to the nearest existing equivalent — the form's response view —
// which is stated rather than silently left broken, per requirements.md §7.9's own allowance.
//
// requirements.md §7.9 asks for "sharer" on the card, but the real backend's `sharedBy`
// (`backend_updates_for_frontend.md` §13) is a raw userId, not a populated name — there is
// nothing here to display as a person. Not fabricated; the workspace/personal fact still renders,
// the "shared by" clause doesn't. Backend action required if a display name is wanted here.
export function SharedFormCard({ item }: SharedFormCardProps) {
  return (
    <Link href={`/forms/${item.id}/responses`} className="block h-full no-underline">
      <Card className="flex flex-col justify-between gap-3 h-full transition-shadow hover:shadow-md border border-[var(--border-default)] hover:border-[var(--border-strong)]">
        <div className="flex flex-col gap-2">
          <Tag>SHARED FORM</Tag>
          <h3 className="text-body font-semibold text-[var(--text-primary)] truncate">{item.title}</h3>
          <p className="text-caption text-[var(--text-muted)]">{item.workspaceName ?? 'Personal'}</p>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-[var(--border-default)]">
          <Badge variant="outline">{ROLE_LABELS[item.role]}</Badge>
          <span className="text-caption text-[var(--text-muted)]">{formatRelativeTime(item.sharedAt)}</span>
        </div>
      </Card>
    </Link>
  );
}
