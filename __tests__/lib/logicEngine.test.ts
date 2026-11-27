/**
 * Example-based tests for the pure logic engine (evaluateLogicRules, getVisiblePageFields, buildAnswers).
 */

import { describe, it, expect } from 'vitest';
import { evaluateLogicRules, getVisiblePageFields, buildAnswers } from '@/lib/logicEngine';
import type { FormField } from '@/types/form';

function field(overrides: Partial<FormField> & Pick<FormField, 'fieldId' | 'pageId' | 'type'>): FormField {
  return {
    label: 'Label',
    required: false,
    deleted: false,
    order: 0,
    ...overrides,
  } as FormField;
}

describe('evaluateLogicRules', () => {
  it('hides the target field when a hide rule condition is met', () => {
    const fields: FormField[] = [
      field({
        fieldId: 'source', pageId: 'p1', type: 'dropdown', options: ['a', 'b'],
        logicRules: [{ condition: { fieldId: 'source', operator: 'equals', value: 'a' }, action: 'hide', targetFieldId: 'target' }],
      }),
      field({ fieldId: 'target', pageId: 'p1', type: 'short_text' }),
    ];
    const hidden = evaluateLogicRules(fields, { source: 'a' });
    expect(hidden.has('target')).toBe(true);
  });

  it('shows the target field when its show rule condition is met', () => {
    const fields: FormField[] = [
      field({
        fieldId: 'source', pageId: 'p1', type: 'dropdown', options: ['a', 'b'],
        logicRules: [{ condition: { fieldId: 'source', operator: 'equals', value: 'a' }, action: 'show', targetFieldId: 'target' }],
      }),
      field({ fieldId: 'target', pageId: 'p1', type: 'short_text' }),
    ];
    const hidden = evaluateLogicRules(fields, { source: 'a' });
    expect(hidden.has('target')).toBe(false);
  });

  it('a field targeted only by show rules defaults to hidden when none match', () => {
    const fields: FormField[] = [
      field({
        fieldId: 'source', pageId: 'p1', type: 'dropdown', options: ['a', 'b'],
        logicRules: [{ condition: { fieldId: 'source', operator: 'equals', value: 'a' }, action: 'show', targetFieldId: 'target' }],
      }),
      field({ fieldId: 'target', pageId: 'p1', type: 'short_text' }),
    ];
    const hidden = evaluateLogicRules(fields, { source: 'b' });
    expect(hidden.has('target')).toBe(true);
  });

  it('a matching hide rule wins over a matching show rule, whatever their order, as the server decides', () => {
    const rule = (action: 'show' | 'hide') => ({ condition: { fieldId: 'src', operator: 'equals', value: 'x' }, action, targetFieldId: 't' });
    for (const rules of [[rule('show'), rule('hide')], [rule('hide'), rule('show')]]) {
      const fields = [{ fieldId: 'src', logicRules: rules }, { fieldId: 't' }] as unknown as Parameters<typeof evaluateLogicRules>[0];
      expect(evaluateLogicRules(fields, { src: 'x' }).has('t')).toBe(true);
    }
  });

  it('any one of several show rules is enough', () => {
    const rule = (value: string) => ({ condition: { fieldId: 'src', operator: 'equals', value }, action: 'show', targetFieldId: 't' });
    const fields = [{ fieldId: 'src', logicRules: [rule('a'), rule('b')] }, { fieldId: 't' }] as unknown as Parameters<typeof evaluateLogicRules>[0];
    expect(evaluateLogicRules(fields, { src: 'a' }).has('t')).toBe(false);
    expect(evaluateLogicRules(fields, { src: 'b' }).has('t')).toBe(false);
    expect(evaluateLogicRules(fields, { src: 'c' }).has('t')).toBe(true);
  });

  it('returns an empty set when no rules are defined', () => {
    const fields: FormField[] = [field({ fieldId: 'a', pageId: 'p1', type: 'short_text' })];
    expect(evaluateLogicRules(fields, {}).size).toBe(0);
  });
});

describe('getVisiblePageFields', () => {
  it('returns fields for the given page, sorted by order, excluding deleted and hidden', () => {
    const fields: FormField[] = [
      field({ fieldId: 'b', pageId: 'p1', type: 'short_text', order: 1 }),
      field({ fieldId: 'a', pageId: 'p1', type: 'short_text', order: 0 }),
      field({ fieldId: 'deleted', pageId: 'p1', type: 'short_text', order: 2, deleted: true }),
      field({ fieldId: 'hidden', pageId: 'p1', type: 'short_text', order: 3 }),
      field({ fieldId: 'other-page', pageId: 'p2', type: 'short_text', order: 0 }),
    ];
    const result = getVisiblePageFields(fields, 'p1', new Set(['hidden']));
    expect(result.map((f) => f.fieldId)).toEqual(['a', 'b']);
  });
});

describe('buildAnswers', () => {
  it('excludes hidden and deleted fields, maps fieldId/fieldType/fieldLabel/value', () => {
    const fields: FormField[] = [
      field({ fieldId: 'a', pageId: 'p1', type: 'short_text' }),
      field({ fieldId: 'hidden', pageId: 'p1', type: 'short_text' }),
      field({ fieldId: 'deleted', pageId: 'p1', type: 'short_text', deleted: true }),
    ];
    const answers = buildAnswers(fields, new Set(['hidden']), { a: 'hello' });
    expect(answers).toEqual([{ fieldId: 'a', fieldType: 'short_text', fieldLabel: 'Label', value: 'hello' }]);
  });
});
