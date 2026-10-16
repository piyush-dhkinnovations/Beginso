import { describe, it, expect } from 'vitest';
import { detectRespondentIdentity, initialsOf } from '@/lib/formatters';
import type { FormField } from '@/types/form';

const f = (fieldId: string, type: string, label: string): FormField =>
  ({ fieldId, type, label, required: false, deleted: false }) as FormField;

const FIELDS = [
  f('n', 'short_text', 'Full name'),
  f('c', 'multiple_choice', 'Preferred contact'),
  f('y', 'yes_no', 'Subscribe?'),
  f('e', 'email', 'Email'),
];

describe('detectRespondentIdentity', () => {
  it('takes the name from the name field, not from a choice answer (QA A6-001)', () => {
    const id = detectRespondentIdentity({ n: 'Alice Pro', c: 'Meeting', y: 'No', e: 'alice@example.com' }, FIELDS);
    expect(id).toEqual({ label: 'Alice Pro', email: 'alice@example.com' });
  });

  it('never shows an arbitrary answer as a person', () => {
    expect(detectRespondentIdentity({ c: 'Meeting', y: 'No' }, FIELDS).label).toBeUndefined();
  });

  it('joins first and last name fields', () => {
    const fields = [f('a', 'short_text', 'First name'), f('b', 'short_text', 'Last name')];
    expect(detectRespondentIdentity({ a: 'Priya', b: 'Sharma' }, fields).label).toBe('Priya Sharma');
  });

  it('does not treat "Company name" as the respondent', () => {
    expect(detectRespondentIdentity({ x: 'Acme' }, [f('x', 'short_text', 'Company name')]).label).toBeUndefined();
  });

  it('ignores a deleted name field', () => {
    const fields = [{ ...f('n', 'short_text', 'Name'), deleted: true } as FormField];
    expect(detectRespondentIdentity({ n: 'Ghost' }, fields).label).toBeUndefined();
  });

  it('guesses no name without field definitions, but still finds an email-shaped answer', () => {
    expect(detectRespondentIdentity({ a: 'Meeting', b: 'me@example.com' })).toEqual({ label: undefined, email: 'me@example.com' });
  });
});

describe('initialsOf', () => {
  it.each([
    ['José Álvarez 🎉', 'JÁ'],
    ['Lena <b>Test</b>', 'LT'],
    ['priya sharma', 'PS'],
    ['Madonna', 'M'],
    ['Ana María de la Cruz', 'AC'],
    ['🎉🎉', ''],
    ['', ''],
    [undefined, ''],
  ])('%s -> %s', (name, expected) => {
    expect(initialsOf(name as string | undefined)).toBe(expected);
  });

  it('never returns a lone surrogate', () => {
    expect(initialsOf('😀 Zed')).toBe('Z');
    expect(/[\uD800-\uDFFF]/.test(initialsOf('J🎉'))).toBe(false);
  });
});
