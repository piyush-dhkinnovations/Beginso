/**
 * `placeholderData` for a paginated/filtered list: keep showing the previous page while the next one
 * loads (no skeleton flash), but never across a different scope. Convention in lib/queryKeys.ts: the
 * LAST key segment is the page / params; everything before it is the scope (context, form, tab).
 * A scope change therefore starts clean instead of briefly showing another workspace's rows.
 */
export function keepPreviousInScope<T>(key: readonly unknown[]) {
  const scope = JSON.stringify(key.slice(0, -1));
  return (previous: T | undefined, previousQuery: { queryKey: readonly unknown[] } | undefined): T | undefined =>
    previousQuery && JSON.stringify(previousQuery.queryKey.slice(0, -1)) === scope ? previous : undefined;
}
