import { describe, it, expect } from 'vitest';
import { convertField, convertibleTypes } from '@/lib/fieldConversion';
import type { FieldType, FormField } from '@/types/form';

const labelFor = (t: FieldType) => ({ dropdown: 'Dropdown', multiple_choice: 'Multiple Choice', short_text: 'Short Text', long_text: 'Long Text', number: 'Number', currency: 'Amount' } as Record<string, string>)[t] ?? t;
const base = { fieldId: 'f1', pageId: 'p1', required: true, deleted: false, order: 2, helpText: 'h' };

describe('convertibleTypes', () => {
  it('lists the other types of the same kind, and nothing for kinds that cannot switch', () => {
    expect(convertibleTypes('dropdown').sort()).toEqual(['checkbox', 'multiple_choice']);
    expect(convertibleTypes('short_text')).toContain('long_text');
    expect(convertibleTypes('number')).toEqual(['currency']);
    expect(convertibleTypes('signature')).toEqual([]);
  });
});

describe('convertField', () => {
  it('keeps id, page, order, required, help text and the options when a dropdown becomes multiple choice', () => {
    const f = { ...base, type: 'dropdown', label: 'Colour', options: ['Red', 'Blue'], maxLength: 5 } as unknown as FormField;
    const out = convertField(f, 'multiple_choice', labelFor) as any;
    expect(out).toMatchObject({ ...base, type: 'multiple_choice', label: 'Colour', options: ['Red', 'Blue'] });
    expect(out.maxLength).toBeUndefined();
  });

  it('renames a label nobody changed, but leaves one the owner wrote', () => {
    expect(convertField({ ...base, type: 'dropdown', label: 'Dropdown', options: [] } as unknown as FormField, 'multiple_choice', labelFor).label).toBe('Multiple Choice');
    expect(convertField({ ...base, type: 'dropdown', label: 'Pick', options: [] } as unknown as FormField, 'multiple_choice', labelFor).label).toBe('Pick');
  });

  it('drops settings the new type has no use for and adds the currency default', () => {
    const out = convertField({ ...base, type: 'short_text', label: 'x', maxLength: 20, pattern: 'a' } as unknown as FormField, 'phone', labelFor) as any;
    expect(out.maxLength).toBeUndefined();
    const money = convertField({ ...base, type: 'number', label: 'x', min: 1, max: 9 } as unknown as FormField, 'currency', labelFor) as any;
    expect(money).toMatchObject({ currency: 'INR', min: 1, max: 9 });
  });
});
