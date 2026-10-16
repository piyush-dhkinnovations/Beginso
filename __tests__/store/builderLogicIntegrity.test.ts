import { describe, it, expect, beforeEach } from 'vitest';
import { useBuilderStore } from '@/store/builderStore';
import type { Form, FormField, LogicRule } from '@/types/form';

const rule = (source: string, target: string): LogicRule => ({ condition: { fieldId: source, operator: 'equals', value: 'x' }, action: 'show', targetFieldId: target });
const field = (fieldId: string, order: number): FormField => ({ fieldId, pageId: 'p1', type: 'short_text', label: fieldId, required: false, deleted: false, order }) as FormField;

const load = (fields: FormField[]) =>
  useBuilderStore.getState().initForm({
    _id: 'f', workspaceId: 'w', title: 'T', description: '', status: 'draft', fields, pages: [], branding: {},
    settings: { honeypotEnabled: true }, schemaVersion: 1, responseCount: 0, createdAt: '', updatedAt: '',
  } as Form);
const rulesOf = (id: string) => useBuilderStore.getState().fields.find((f) => f.fieldId === id)?.logicRules ?? [];

describe('builder logic integrity', () => {
  beforeEach(() => load([field('email', 1), field('phone', 2), field('plan', 3)]));

  it('refuses a rule that would make two fields hide each other forever (QA A4-004)', () => {
    const s = useBuilderStore.getState();
    s.addLogicRule('phone', rule('phone', 'email'));
    s.addLogicRule('email', rule('email', 'phone')); // phone already decides email
    expect(rulesOf('email')).toHaveLength(0);
    expect(rulesOf('phone')).toHaveLength(1);
  });

  it('refuses a longer loop through a chain', () => {
    const s = useBuilderStore.getState();
    s.addLogicRule('email', rule('email', 'phone'));
    s.addLogicRule('phone', rule('phone', 'plan'));
    s.addLogicRule('plan', rule('plan', 'email'));
    expect(rulesOf('plan')).toHaveLength(0);
  });

  it('still allows editing a rule in place, and a later field deciding an earlier one', () => {
    const s = useBuilderStore.getState();
    s.addLogicRule('plan', rule('plan', 'email')); // later field decides an earlier one: allowed
    expect(rulesOf('plan')).toHaveLength(1);
    s.updateLogicRule('plan', 0, 'plan', { ...rule('plan', 'email'), action: 'hide' });
    expect(rulesOf('plan')[0].action).toBe('hide');
  });

  it('removes rules that show or hide a field when that field is deleted, and undo brings them back (QA A4-005)', () => {
    const s = useBuilderStore.getState();
    s.addLogicRule('plan', rule('plan', 'email'));
    s.addLogicRule('plan', rule('plan', 'phone'));
    s.softDeleteField('email');
    expect(rulesOf('plan').map((r) => r.targetFieldId)).toEqual(['phone']);
    useBuilderStore.getState().undo();
    expect(rulesOf('plan').map((r) => r.targetFieldId).sort()).toEqual(['email', 'phone']);
  });

  it('drops a deleted field\'s own rules', () => {
    const s = useBuilderStore.getState();
    s.addLogicRule('plan', rule('plan', 'email'));
    s.softDeleteField('plan');
    expect(rulesOf('plan')).toEqual([]);
  });
});
