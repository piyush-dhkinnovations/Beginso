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

// The API returns answers keyed by the question's LABEL and strips id-style keys (UUIDs, 24-hex ids, f_...). The first
// version of the name fix looked answers up by field id, which found nothing on real data: every respondent became
// "Anonymous" in production, while tests that used id-keyed answers passed.
describe('detectRespondentIdentity on the real API shape: UUID field ids, label-keyed answers', () => {
  const REAL_FIELDS = [
    f('3f2b8c1e-5a6d-4f0e-9b7a-1c2d3e4f5a6b', 'short_text', 'Full name'),
    f('8d1e2f3a-4b5c-4d6e-8f70-91a2b3c4d5e6', 'multiple_choice', 'Preferred contact'),
    f('0a9b8c7d-6e5f-4a3b-9c2d-1e0f9a8b7c6d', 'email', 'Work email'),
  ];

  it('finds the name and email by label', () => {
    const id = detectRespondentIdentity({ 'Full name': 'Alice Pro', 'Preferred contact': 'Meeting', 'Work email': 'alice@example.com' }, REAL_FIELDS);
    expect(id).toEqual({ label: 'Alice Pro', email: 'alice@example.com' });
  });

  it('still shows a real name when the first answer is a choice (the original bug)', () => {
    expect(detectRespondentIdentity({ 'Preferred contact': 'Meeting', 'Full name': 'Alice Pro' }, REAL_FIELDS).label).toBe('Alice Pro');
  });

  it('first and last name fields are joined by label too', () => {
    const fields = [f('a-uuid', 'short_text', 'First name'), f('b-uuid', 'short_text', 'Last name')];
    expect(detectRespondentIdentity({ 'First name': 'Priya', 'Last name': 'Sharma' }, fields).label).toBe('Priya Sharma');
  });

  it('falls back to the field id for data that still carries it', () => {
    expect(detectRespondentIdentity({ '3f2b8c1e-5a6d-4f0e-9b7a-1c2d3e4f5a6b': 'Carol' }, REAL_FIELDS).label).toBe('Carol');
  });

  it('a label-keyed answer wins over a stale id-keyed one', () => {
    expect(detectRespondentIdentity({ 'Full name': 'By label', '3f2b8c1e-5a6d-4f0e-9b7a-1c2d3e4f5a6b': 'By id' }, REAL_FIELDS).label).toBe('By label');
  });
});

describe('detectRespondentIdentity: the question chosen to name the respondent', () => {
  const fields = [f('n', 'short_text', 'Full name'), f('film', 'short_text', 'Title of the film'), f('e', 'email', 'Email')];
  const answers = { 'Full name': 'Alice Pro', 'Title of the film': 'Monsoon Road', Email: 'alice@example.com' };

  it('uses that answer as the name, and still finds the email', () => {
    expect(detectRespondentIdentity(answers, fields, null, 'film')).toEqual({ label: 'Monsoon Road', email: 'alice@example.com' });
  });

  it('`auto`, nothing, or a question that is gone keeps the detection', () => {
    expect(detectRespondentIdentity(answers, fields, null, 'auto').label).toBe('Alice Pro');
    expect(detectRespondentIdentity(answers, fields).label).toBe('Alice Pro');
    expect(detectRespondentIdentity(answers, fields, null, 'deleted-question').label).toBe('Alice Pro');
  });

  it('a chosen question the response left blank falls back to the detected name', () => {
    expect(detectRespondentIdentity({ 'Full name': 'Alice Pro' }, fields, null, 'film').label).toBe('Alice Pro');
  });

  it('a chosen question can hold a number', () => {
    const withNumber = [...fields, f('n2', 'number', 'Entry number')];
    expect(detectRespondentIdentity({ 'Entry number': 42 }, withNumber, null, 'n2').label).toBe('42');
  });
});
