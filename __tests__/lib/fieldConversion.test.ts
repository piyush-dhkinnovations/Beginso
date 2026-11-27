import { describe, it, expect } from 'vitest';
import { convertField, rememberSettings, ruleCanMatch, typeDefaults } from '@/lib/fieldConversion';
import { FIELD_TYPE_CONFIG } from '@/components/form-builder/Toolbox';
import type { FieldType, FormField, LogicRule } from '@/types/form';

const labelFor = (t: FieldType) => ({ dropdown: 'Dropdown', multiple_choice: 'Multiple Choice', short_text: 'Short Text' } as Record<string, string>)[t] ?? t;
const base = { fieldId: 'f1', pageId: 'p1', required: true, deleted: false, order: 2, helpText: 'h' };
const field = (type: FieldType, extra: Record<string, unknown> = {}) => ({ ...base, type, label: 'x', ...typeDefaults(type), ...extra }) as unknown as FormField;
const convert = (f: FormField, to: FieldType, memory?: Record<string, unknown>) => convertField(f, to, labelFor, memory) as unknown as Record<string, unknown>;

describe('convertField', () => {
  const types = FIELD_TYPE_CONFIG.map((c) => c.type);

  it('turns every type into every other type, keeping id, page, order, label, help text and required', () => {
    for (const from of types) {
      for (const to of types) {
        expect(convert(field(from), to), `${from} -> ${to}`).toMatchObject({ ...base, type: to, label: 'x' });
      }
    }
  });

  it('always leaves a choice question with at least one option, which the server requires', () => {
    for (const from of types) {
      for (const to of ['dropdown', 'multiple_choice', 'checkbox'] as const) {
        expect((convert(field(from), to).options as string[]).length).toBeGreaterThan(0);
      }
    }
    expect(convert(field('checkbox', { options: [] }), 'dropdown').options).toEqual(['Option 1']);
    expect(convert(field('yes_no'), 'multiple_choice').options).toEqual(['Yes', 'No']);
  });

  it('carries options between choice types and drops settings the new type has no use for', () => {
    const out = convert(field('dropdown', { options: ['Red', 'Blue'], maxLength: 5 }), 'multiple_choice');
    expect(out.options).toEqual(['Red', 'Blue']);
    expect(out.maxLength).toBeUndefined();
    expect(convert(field('number', { min: 1, max: 9 }), 'currency')).toMatchObject({ currency: 'INR', min: 1, max: 9 });
    expect(convert(field('short_text', { maxLength: 20, placeholder: 'p' }), 'signature')).toEqual({ ...base, type: 'signature', label: 'x', placeholder: '' });
  });

  it('brings back remembered settings, but not one the owner has since cleared', () => {
    const choice = field('dropdown', { options: ['Red'] });
    const memory = rememberSettings(choice);
    const text = convertField(choice, 'short_text', labelFor, memory);
    expect(convert(text, 'checkbox', memory).options).toEqual(['Red']);

    const limited = rememberSettings(field('short_text', { maxLength: 20 }));
    const cleared = rememberSettings(field('long_text'), limited);
    expect(convert(field('email'), 'short_text', cleared).maxLength).toBeUndefined();
  });

  it('renames a label nobody changed, but leaves one the owner wrote', () => {
    expect(convertField(field('dropdown', { label: 'Dropdown' }), 'multiple_choice', labelFor).label).toBe('Multiple Choice');
    expect(convertField(field('dropdown', { label: 'Pick' }), 'multiple_choice', labelFor).label).toBe('Pick');
  });
});

describe('ruleCanMatch', () => {
  const rule = (value: string) => ({ condition: { fieldId: 'f1', operator: 'equals', value }, action: 'show', targetFieldId: 't' }) as LogicRule;

  it('keeps a rule only while an answer of that type could equal its value', () => {
    expect(ruleCanMatch(field('short_text'), rule('anything'))).toBe(true);
    expect(ruleCanMatch(field('dropdown', { options: ['A'] }), rule('A'))).toBe(true);
    expect(ruleCanMatch(field('dropdown', { options: ['A'] }), rule('B'))).toBe(false);
    expect(ruleCanMatch(field('yes_no'), rule('Yes'))).toBe(true);
    expect(ruleCanMatch(field('yes_no'), rule('Maybe'))).toBe(false);
    expect(ruleCanMatch(field('number'), rule('12.5'))).toBe(true);
    expect(ruleCanMatch(field('number'), rule('twelve'))).toBe(false);
    expect(ruleCanMatch(field('rating'), rule('5'))).toBe(true);
    expect(ruleCanMatch(field('rating'), rule('6'))).toBe(false);
    expect(ruleCanMatch(field('date'), rule('2026-01-31'))).toBe(true);
    expect(ruleCanMatch(field('time'), rule('2026-01-31'))).toBe(false);
    for (const type of ['file_upload', 'image_upload', 'signature'] as const) expect(ruleCanMatch(field(type), rule('a'))).toBe(false);
  });
});
