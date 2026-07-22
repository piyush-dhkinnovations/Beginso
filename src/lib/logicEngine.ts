/**
 * Pure conditional-logic evaluation for the public form. No React/DOM imports —
 * keeps evaluateLogicRules trivially unit- and property-testable.
 */

import type { FormField } from '@/types/form';
import type { Answer, FieldValue } from '@/types/publicForm';

/**
 * Evaluates all logic rules across all fields in the form schema.
 *
 * Rules are embedded on the *source* field (field.logicRules[]).
 * Each rule: IF source-field equals value THEN show|hide targetFieldId.
 * Fields not targeted by any matching rule are visible by default.
 * When multiple rules target the same field, the LAST matching rule wins.
 *
 * @returns Set of fieldIds that are currently HIDDEN.
 */
export function evaluateLogicRules(
  fields: FormField[],
  answers: Record<string, unknown>
): Set<string> {
  const resolved = new Map<string, 'show' | 'hide'>();

  for (const field of fields) {
    const rules = field.logicRules ?? [];
    for (const rule of rules) {
      const sourceValue = answers[rule.condition.fieldId];
      const conditionMet =
        rule.condition.operator === 'equals' &&
        String(sourceValue ?? '') === String(rule.condition.value);

      if (conditionMet) {
        resolved.set(rule.targetFieldId, rule.action);
      }
    }
  }

  const hiddenIds = new Set<string>();
  for (const [targetId, action] of resolved) {
    if (action === 'hide') hiddenIds.add(targetId);
  }
  return hiddenIds;
}

/** Fields visible for a given page: not deleted, on this page, not hidden — sorted by order. */
export function getVisiblePageFields(
  fields: FormField[],
  pageId: string,
  hiddenFieldIds: Set<string>
): FormField[] {
  return fields
    .filter((f) => !f.deleted && f.pageId === pageId && !hiddenFieldIds.has(f.fieldId))
    .sort((a, b) => a.order - b.order);
}

/** Builds the Answer[] array for submission from all visible fields across all pages. */
export function buildAnswers(
  fields: FormField[],
  hiddenFieldIds: Set<string>,
  values: Record<string, FieldValue>
): Answer[] {
  return fields
    .filter((f) => !f.deleted && !hiddenFieldIds.has(f.fieldId))
    .map((f) => ({
      fieldId: f.fieldId,
      fieldType: f.type,
      fieldLabel: f.label,
      value: values[f.fieldId],
    }));
}
