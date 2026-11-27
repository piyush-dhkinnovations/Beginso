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
 * A field targeted by at least one 'show' rule defaults to HIDDEN (whitelist: visible when ANY of them matches).
 * A field targeted only by 'hide' rules defaults to visible. A matching 'hide' rule wins over a matching 'show'
 * rule whatever their order: the server decides the same way (backend getHiddenFieldIds), and a form that showed a
 * question the server counts as hidden lost the answer typed into it.
 *
 * @returns Set of fieldIds that are currently HIDDEN.
 */
export function evaluateLogicRules(
  fields: FormField[],
  answers: Record<string, unknown>
): Set<string> {
  const whitelisted = new Set<string>();
  const shown = new Set<string>();
  const hidden = new Set<string>();

  for (const field of fields) {
    const rules = field.logicRules ?? [];
    for (const rule of rules) {
      if (rule.action === 'show') whitelisted.add(rule.targetFieldId);

      const sourceValue = answers[rule.condition.fieldId];
      const conditionMet =
        rule.condition.operator === 'equals' &&
        String(sourceValue ?? '') === String(rule.condition.value);

      if (conditionMet) {
        (rule.action === 'hide' ? hidden : shown).add(rule.targetFieldId);
      }
    }
  }

  for (const targetId of whitelisted) if (!shown.has(targetId)) hidden.add(targetId);
  return hidden;
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
