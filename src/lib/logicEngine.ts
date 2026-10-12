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
 * A field targeted by at least one 'show' rule defaults to HIDDEN (whitelist:
 * only visible when a show rule matches). A field targeted only by 'hide'
 * rules defaults to visible (blacklist: hidden only when a hide rule matches).
 * When multiple rules target the same field, the LAST matching rule wins.
 *
 * @returns Set of fieldIds that are currently HIDDEN.
 */
export function evaluateLogicRules(
  fields: FormField[],
  answers: Record<string, unknown>
): Set<string> {
  const resolved = new Map<string, 'show' | 'hide'>();
  const whitelisted = new Set<string>();

  for (const field of fields) {
    const rules = field.logicRules ?? [];
    for (const rule of rules) {
      if (rule.action === 'show') whitelisted.add(rule.targetFieldId);

      const sourceValue = answers[rule.condition.fieldId];
      const conditionMet =
        rule.condition.operator === 'equals' &&
        String(sourceValue ?? '') === String(rule.condition.value);

      if (conditionMet) {
        resolved.set(rule.targetFieldId, rule.action);
      }
    }
  }

  const hiddenIds = new Set<string>(whitelisted);
  for (const [targetId, action] of resolved) {
    if (action === 'hide') hiddenIds.add(targetId);
    else hiddenIds.delete(targetId);
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
      // file_upload has nothing meaningful to report here — RHF only holds a local
      // filename placeholder, never a real answer. fileKey (backend-filled after the
      // multipart upload) is the only channel that matters for this field type.
      value: f.type === 'file_upload' || f.type === 'image_upload' ? undefined : values[f.fieldId],
    }));
}
