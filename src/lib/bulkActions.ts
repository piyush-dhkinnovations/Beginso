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
