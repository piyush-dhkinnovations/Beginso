import type { FormField } from '@/types/form';

// A logic rule lives on its SOURCE field (`field.logicRules`) and names the field it shows or hides
// (`rule.targetFieldId`), so "source decides target" is an edge source -> target.

/** Ids of live fields that are shown/hidden by `fieldId`, directly or through a chain of rules. */
export function dependentsOf(fields: FormField[], fieldId: string): Set<string> {
  const edges = new Map<string, string[]>();
  for (const f of fields) {
    if (f.deleted) continue;
    for (const rule of f.logicRules ?? []) edges.set(f.fieldId, [...(edges.get(f.fieldId) ?? []), rule.targetFieldId]);
  }
  const seen = new Set<string>();
  const stack = [fieldId];
  while (stack.length > 0) {
    for (const next of edges.get(stack.pop() as string) ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        stack.push(next);
      }
    }
  }
  return seen;
}

/**
 * Would a rule "answer to `sourceId` decides `targetId`" close a loop? It would when `targetId` already decides
 * `sourceId` (directly or through other rules): neither could ever be shown to a respondent.
 */
export const wouldCreateCycle = (fields: FormField[], sourceId: string, targetId: string): boolean =>
  sourceId === targetId || dependentsOf(fields, targetId).has(sourceId);
