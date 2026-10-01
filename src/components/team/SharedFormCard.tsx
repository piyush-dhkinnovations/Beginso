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
// requirements.md §7.9 asks for "sharer" on the card. Real bug found and fixed (22 Sep 2026):
// this used to render nothing here at all, because the live `sharedBy` was a raw userId with no
// name anywhere in the payload — now live-confirmed enriched (services/shared.ts's own mapping),
// so the sharer's name renders when the backend actually sent one, and degrades to nothing
// (never a raw id) when it didn't.
export function SharedFormCard({ item }: SharedFormCardProps) {
  return (
    <Link href={`/forms/${item.id}/responses`} className="block h-full no-underline">
      <Card className="flex flex-col justify-between gap-3 h-full transition-shadow hover:shadow-(--shadow-md) border border-(--border-default) hover:border-(--border-strong)">
        <div className="flex flex-col gap-2">
          <Tag>SHARED FORM</Tag>
          <h3 className="bg-body font-semibold text-(--text-primary) truncate">{item.title}</h3>
          <p className="bg-caption text-(--text-muted)">
            {item.workspaceName ?? 'Personal'}
            {item.sharedByName && ` · Shared by ${item.sharedByName}`}
          </p>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-(--border-default)">
          <Badge variant="outline">{ROLE_LABELS[item.role]}</Badge>
          <span className="bg-caption text-(--text-muted)">{formatRelativeTime(item.sharedAt)}</span>
        </div>
      </Card>
    </Link>
  );
}
