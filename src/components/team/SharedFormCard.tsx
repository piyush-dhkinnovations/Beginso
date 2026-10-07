import Link from 'next/link';
import { Calendar } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { FormTile } from '@/components/forms/FormTile';
import { SharedRoleBadge } from './SharedRoleBadge';
import type { SharedFormItem } from '@/types/team';

export interface SharedFormCardProps {
  item: SharedFormItem;
}

/** "Sep 22, 2026" */
export const formatSharedDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

// Grid-view card for a form shared with the caller: tinted icon tile (colour from the form's
// title), title, "workspace · Shared by X", role badge and the date it was shared. The whole card is
// one link (one tab stop) — it opens the form at the nearest existing view for a grant-only viewer
// (its responses; no dedicated respondent/reviewer destination exists yet, requirements.md §7.9).
//
// requirements.md §7.9 asks for "sharer" on the card. Real bug found and fixed (22 Sep 2026): this
// used to render nothing for the sharer, because the live `sharedBy` was a raw userId with no name
// anywhere in the payload — now live-confirmed enriched (services/shared.ts's own mapping), so the
// sharer's name renders when the backend actually sent one, and degrades to nothing (never a raw
// id) when it didn't.
export function SharedFormCard({ item }: SharedFormCardProps) {
  return (
    <Link href={`/forms/${item.id}/inbox`} className="block h-full no-underline">
      <Card padded={false} className="h-full overflow-hidden transition-colors hover:border-(--border-strong)">
        <div className="flex items-start justify-between gap-3 px-4 pt-4">
          <FormTile title={item.title} />
          <SharedRoleBadge role={item.role} />
        </div>
        <div className="flex flex-1 flex-col gap-1 px-4 pt-3">
          <h3 className="truncate bg-body font-semibold text-(--text-primary)">{item.title}</h3>
          <p className="bg-body-sm text-(--text-muted)">
            {item.workspaceName ?? 'Personal'}
            {item.sharedByName && ` · Shared by ${item.sharedByName}`}
          </p>
        </div>
        <div className="mt-3 flex items-center gap-1.5 border-t border-(--border-subtle) px-4 py-3 bg-caption text-(--text-muted)">
          <Calendar size={13} aria-hidden="true" />
          {formatSharedDate(item.sharedAt)}
        </div>
      </Card>
    </Link>
  );
}
