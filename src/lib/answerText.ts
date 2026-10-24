import { buildAnswerKeyMap } from '@/lib/answerKeys';
import type { FormField } from '@/types/form';
import type { ResponseAnswers } from '@/types/response';

/** Reading one answer as a line of text: for table columns, board cards and the respondent's name. */

// Types whose answer is not a line of text worth putting on a card.
const NOT_FOR_CARDS = new Set(['signature', 'file_upload', 'image_upload']);

/** The questions whose answer reads as a line of text (not a signature or an upload): the ones a column, a card title or a name can come from. */
export function textFields(fields: readonly FormField[] | undefined): FormField[] {
  return (fields ?? []).filter((f) => !f.deleted && !NOT_FOR_CARDS.has(f.type));
}

/** One answer as a single line of text, or undefined when there is nothing worth showing. */
export function answerLine(value: unknown): string | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string') return value.startsWith('data:image/') ? undefined : value.trim() || undefined;
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(answerLine).filter(Boolean).join(', ') || undefined;
  if (typeof value === 'object') return Object.values(value as Record<string, unknown>).map(answerLine).filter(Boolean).join(', ') || undefined;
  return undefined;
}

/** What this response answered to one question (answers are filed under the question's label, with the id as a fallback). */
export function answerFor(answers: ResponseAnswers, fields: readonly FormField[] | undefined, field: FormField): string | undefined {
  const key = buildAnswerKeyMap(fields).get(field) ?? field.label;
  return answerLine(answers[key] ?? answers[field.fieldId]);
}
