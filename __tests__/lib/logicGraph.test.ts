import { describe, it, expect } from 'vitest';
import { dependentsOf, wouldCreateCycle } from '@/lib/logicGraph';
import type { FormField, LogicRule } from '@/types/form';

const rule = (source: string, target: string): LogicRule => ({ condition: { fieldId: source, operator: 'equals', value: 'x' }, action: 'show', targetFieldId: target });
const field = (fieldId: string, logicRules: LogicRule[] = [], deleted = false) => ({ fieldId, type: 'short_text', label: fieldId, required: false, deleted, logicRules }) as FormField;

describe('logic graph', () => {
  // a decides b, b decides c
  const fields = [field('a', [rule('a', 'b')]), field('b', [rule('b', 'c')]), field('c'), field('d')];

  it('finds everything a field shows or hides, directly or through a chain', () => {
    expect([...dependentsOf(fields, 'a')].sort()).toEqual(['b', 'c']);
    expect([...dependentsOf(fields, 'c')]).toEqual([]);
  });

  it('flags a rule that would close a loop (QA A4-004)', () => {
    expect(wouldCreateCycle(fields, 'b', 'a')).toBe(true); // b decides a, but a already decides b
    expect(wouldCreateCycle(fields, 'c', 'a')).toBe(true); // through the chain a -> b -> c
    expect(wouldCreateCycle(fields, 'a', 'a')).toBe(true);
  });

  it('allows rules that do not loop, including a later field deciding an earlier one', () => {
    expect(wouldCreateCycle(fields, 'a', 'c')).toBe(false);
    expect(wouldCreateCycle(fields, 'd', 'a')).toBe(false);
  });

  it('ignores rules on deleted fields', () => {
    const withDeleted = [field('a', [rule('a', 'b')], true), field('b')];
    expect(dependentsOf(withDeleted, 'a').size).toBe(0);
    expect(wouldCreateCycle(withDeleted, 'b', 'a')).toBe(false);
  });
});
