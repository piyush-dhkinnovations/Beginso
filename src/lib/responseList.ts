// Sprint 12 (inbox-collaboration), requirements.md §7.1: `normalizeResponseStatus` is removed —
// the fixed status union it validated no longer exists. Legacy `?status=` parsing now lives in
// `lib/inboxFilters.ts` (`normalizeStageCategory`/`mapLegacyStatusToStageId`), which maps the value
// onto a workspace's actual stages rather than validating it against a hardcoded set.

export function normalizeResponsePage(rawPage: string | null): number {
  if (rawPage === null) return 1;
  const page = Number(rawPage);
  return Number.isSafeInteger(page) && page >= 1 ? page : 1;
}

export function clampResponsePage(page: number, totalPages: number): number {
  return Math.min(Math.max(page, 1), Math.max(totalPages, 1));
}

export async function runSequentially<T>(items: readonly T[], operation: (item: T) => Promise<unknown>): Promise<void> {
  for (const item of items) {
    await operation(item);
  }
}
