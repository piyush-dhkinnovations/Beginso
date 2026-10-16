/**
 * D5-001 (frontend half): two questions that share a label are filed under "Comment" and "Comment (2)" by the backend;
 * the response viewer, the respondent name and the chart drill list must read each question's own key.
 */
import { describe, it, expect } from 'vitest';
import { buildAnswerKeyMap, answerKeyOf } from '@/lib/answerKeys';
import { buildAnswerItems } from '@/lib/responseAnswers';
import { detectRespondentIdentity } from '@/lib/formatters';
import type { FormField } from '@/types/form';

const f = (fieldId: string, label: string, type = 'short_text', extra: Partial<FormField> = {}): FormField =>
  ({ fieldId, label, type, pageId: 'p1', order: 0, required: false, deleted: false, ...extra }) as FormField;

describe('answer keys (mirror of the backend rule)', () => {
  it('first keeps its label; repeats get (2), (3), skipping a real label that collides', () => {
    const fields = [f('a', 'Comment'), f('b', 'Comment'), f('c', 'Comment (2)')];
    const map = buildAnswerKeyMap(fields);
    expect(fields.map((x) => map.get(x))).toEqual(['Comment', 'Comment (3)', 'Comment (2)']);
    expect(answerKeyOf(fields, fields[1])).toBe('Comment (3)');
  });

  it('a form without repeated labels keeps every label as is', () => {
    const fields = [f('a', 'Name'), f('b', 'Email')];
    expect(fields.map((x) => buildAnswerKeyMap(fields).get(x))).toEqual(['Name', 'Email']);
  });

  it('a deleted question does not take the label from an active one', () => {
    const fields = [f('a', 'Comment', 'short_text', { deleted: true }), f('b', 'Comment')];
    expect(buildAnswerKeyMap(fields).get(fields[1])).toBe('Comment');
  });
});

describe('response viewer', () => {
  // The shape the live API returns: answers keyed by each question's own key.
  const fields = [f('a', 'Comment', 'short_text', { order: 0 }), f('b', 'Comment', 'short_text', { order: 1 })];
  const answers = { Comment: 'first answer', 'Comment (2)': 'second answer' };

  it('shows each same-label question with its own answer', () => {
    const items = buildAnswerItems(answers, [], fields);
    expect(items.map((i) => [i.key, i.value])).toEqual([['a', 'first answer'], ['b', 'second answer']]);
  });

  it('does not list the second answer again as an orphan', () => {
    expect(buildAnswerItems(answers, [], fields)).toHaveLength(2);
  });
});

describe('respondent name', () => {
  it('reads the name from the question that holds it even when another question shares the label', () => {
    const fields = [f('a', 'Name'), f('b', 'Name')];
    // Only the second "Name" was filled in.
    expect(detectRespondentIdentity({ 'Name (2)': 'Asha Rao' }, fields).label).toBe('Asha Rao');
    expect(detectRespondentIdentity({ Name: 'Ravi', 'Name (2)': 'Asha Rao' }, fields).label).toBe('Ravi');
  });
});
