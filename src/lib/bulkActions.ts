import type { BulkResult } from '@/types/response';

/**
 * Sprint 12 (inbox-collaboration), design.md §21 ("bulk partial-failure accounting" property),
 * requirements.md §7.5 (5.1): "Partial failure: ... failed ids stay selected." Pure so it's
 * trivial to property-test (`__tests__/services/responses.service.test.ts`) and reuse from
 * `useInboxMutations` (task 2.3) and `BulkActionBar` (task 2.4) without duplicating the rule.
 *
 * An id stays selected unless the server explicitly reported it succeeded — this also covers an
 * id the server didn't mention at all (never silently treated as succeeded).
 */
export function idsRemainingSelected(attempted: readonly string[], result: BulkResult): string[] {
  const succeededSet = new Set(result.succeeded);
  return attempted.filter((id) => !succeededSet.has(id));
}

/**
 * The reason to show beside "N failed". The server says why each row failed ("This response's form has no workspace to
 * resolve stages against"); the toast used to print only the count, so a whole batch could fail with no explanation (QA
 * A6-003). The most common reason is shown, and a count of the rest when the failures differ. Reasons are the server's
 * own user-facing messages, never raw errors.
 */
export function describeBulkFailures(failed: readonly { reason?: string }[]): string {
  const counts = new Map<string, number>();
  for (const f of failed) {
    const reason = (f.reason ?? '').trim();
    if (reason) counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }
  if (counts.size === 0) return '';
  const [top, ...rest] = [...counts].sort((a, b) => b[1] - a[1]);
  const text = top[0].replace(/[.\s]+$/, '');
  return rest.length > 0 ? ` ${text}, and ${rest.length} other reason${rest.length === 1 ? '' : 's'}.` : ` ${text}.`;
}
