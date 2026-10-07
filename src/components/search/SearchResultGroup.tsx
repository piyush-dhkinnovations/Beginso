'use client';

import { Card } from '@/components/ui/Card';
import { SearchResultRow } from './SearchResultRow';
import { SEARCH_GROUP_LABEL, type SearchGroup, type SearchGroupKey } from '@/types/search';

interface SearchResultGroupProps {
  groupKey: SearchGroupKey;
  group: SearchGroup;
  query: string;
  scope: string;
  /** A muted line under the heading, e.g. the Responses scope label. */
  note?: string;
}

// Full-page group card: "Forms (2)" with its rows. A group with nothing in it says so by name
// ("No forms match") rather than disappearing, so an empty group is never mistaken for a broken one.
export function SearchResultGroup({ groupKey, group, query, scope, note }: SearchResultGroupProps) {
  const label = SEARCH_GROUP_LABEL[groupKey];
  const headingId = `search-group-${groupKey}`;
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h2 id={headingId} className="bg-h5 text-(--text-primary)">
        {label} ({group.total})
      </h2>
      {note && <p className="bg-caption text-(--text-muted)">{note}</p>}
      {group.total > group.items.length && group.items.length > 0 && (
        <p className="bg-caption text-(--text-muted)">Showing the top {group.items.length}. Refine your search to narrow it down.</p>
      )}
      <Card padded={false} className="overflow-hidden">
        {group.items.length === 0 ? (
          <p className="px-4 py-3 bg-body-sm text-(--text-muted)">No {label.toLowerCase()} match.</p>
        ) : (
          <ul className="divide-y divide-(--border-subtle)">
            {group.items.map((item) => (
              <SearchResultRow key={item.id} result={item} query={query} scope={scope} />
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
