/**
 * Feature: sprint-3-public-form
 * Example-based tests for buildPublicFormSchema — specific error messages and hidden-field skipping.
 */

import { describe, it, expect } from 'vitest';
import { buildPublicFormSchema } from '@/lib/schemas/publicFormSchema';
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

describe('buildPublicFormSchema', () => {
  it('fails empty required short_text with "This field is required"', () => {
    const f = field({ fieldId: 'a', pageId: 'p1', type: 'short_text', required: true });
    const schema = buildPublicFormSchema([f], new Set());
    const result = schema.safeParse({ a: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('This field is required');
    }
  });

  it('fails invalid email with the correct message', () => {
    const f = field({ fieldId: 'a', pageId: 'p1', type: 'email', required: true });
    const schema = buildPublicFormSchema([f], new Set());
    const result = schema.safeParse({ a: 'not-an-email' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Please enter a valid email address.');
    }
  });

  it('reports "This field is required" (not the email-format message) for an empty required email', () => {
    const f = field({ fieldId: 'a', pageId: 'p1', type: 'email', required: true });
    const schema = buildPublicFormSchema([f], new Set());
    const result = schema.safeParse({ a: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('This field is required');
    }
  });

  it('passes an optional email left as an empty string', () => {
    const f = field({ fieldId: 'a', pageId: 'p1', type: 'email', required: false });
    const schema = buildPublicFormSchema([f], new Set());
    expect(schema.safeParse({ a: '' }).success).toBe(true);
  });

  it('reports "This field is required" (not the phone-format message) for an empty required phone', () => {
    const f = field({ fieldId: 'a', pageId: 'p1', type: 'phone', required: true });
    const schema = buildPublicFormSchema([f], new Set());
    const result = schema.safeParse({ a: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('This field is required');
    }
  });

  it('passes an optional phone left as an empty string', () => {
    const f = field({ fieldId: 'a', pageId: 'p1', type: 'phone', required: false });
    const schema = buildPublicFormSchema([f], new Set());
    expect(schema.safeParse({ a: '' }).success).toBe(true);
  });

  it('fails a required number left empty, instead of silently coercing "" to 0', () => {
    const f = field({ fieldId: 'a', pageId: 'p1', type: 'number', required: true });
    const schema = buildPublicFormSchema([f], new Set());
    const result = schema.safeParse({ a: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('This field is required');
    }
  });

  it('passes an optional number left empty', () => {
    const f = field({ fieldId: 'a', pageId: 'p1', type: 'number', required: false });
    const schema = buildPublicFormSchema([f], new Set());
    expect(schema.safeParse({ a: '' }).success).toBe(true);
  });

  it('fails number below min', () => {
    const f = field({ fieldId: 'a', pageId: 'p1', type: 'number', required: true, min: 10 });
    const schema = buildPublicFormSchema([f], new Set());
    const result = schema.safeParse({ a: '5' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Must be at least 10.');
    }
  });

  it('fails number above max', () => {
    const f = field({ fieldId: 'a', pageId: 'p1', type: 'number', required: true, max: 10 });
    const schema = buildPublicFormSchema([f], new Set());
    const result = schema.safeParse({ a: '20' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Must be at most 10.');
    }
  });

  it('fails number outside a min/max range', () => {
    const f = field({ fieldId: 'a', pageId: 'p1', type: 'number', required: true, min: 1, max: 5 });
    const schema = buildPublicFormSchema([f], new Set());
    const result = schema.safeParse({ a: '10' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Must be between 1 and 5.');
    }
  });

  it('fails checkbox with no selections when required', () => {
    const f = field({ fieldId: 'a', pageId: 'p1', type: 'checkbox', required: true, options: ['x', 'y'] });
    const schema = buildPublicFormSchema([f], new Set());
    const result = schema.safeParse({ a: [] });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Please select at least one option.');
    }
  });

  it('fails a date before minDate', () => {
    const f = field({ fieldId: 'a', pageId: 'p1', type: 'date', required: true, minDate: '2026-01-10' });
    const schema = buildPublicFormSchema([f], new Set());
    const result = schema.safeParse({ a: '2026-01-01' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Must be on or after 2026-01-10.');
    }
  });

  it('fails a date after maxDate', () => {
    const f = field({ fieldId: 'a', pageId: 'p1', type: 'date', required: true, maxDate: '2026-01-10' });
    const schema = buildPublicFormSchema([f], new Set());
    const result = schema.safeParse({ a: '2026-02-01' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Must be on or before 2026-01-10.');
    }
  });

  it('passes a date within a minDate/maxDate range', () => {
    const f = field({ fieldId: 'a', pageId: 'p1', type: 'date', required: true, minDate: '2026-01-01', maxDate: '2026-01-31' });
    const schema = buildPublicFormSchema([f], new Set());
    expect(schema.safeParse({ a: '2026-01-15' }).success).toBe(true);
  });

  it('reports "This field is required" (not the range message) for an empty required date with a range', () => {
    const f = field({ fieldId: 'a', pageId: 'p1', type: 'date', required: true, minDate: '2026-01-01' });
    const schema = buildPublicFormSchema([f], new Set());
    const result = schema.safeParse({ a: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('This field is required');
    }
  });

  it('passes an optional date with a range left empty', () => {
    const f = field({ fieldId: 'a', pageId: 'p1', type: 'date', required: false, minDate: '2026-01-01' });
    const schema = buildPublicFormSchema([f], new Set());
    expect(schema.safeParse({ a: '' }).success).toBe(true);
    expect(schema.safeParse({}).success).toBe(true);
  });

  it('fails a required file_upload left undefined, not just empty string', () => {
    const f = field({ fieldId: 'a', pageId: 'p1', type: 'file_upload', required: true });
    const schema = buildPublicFormSchema([f], new Set());
    const result = schema.safeParse({ a: undefined });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('This field is required');
    }
  });

  it('skips hidden fields entirely — no key in the resulting schema shape', () => {
    const f = field({ fieldId: 'a', pageId: 'p1', type: 'short_text', required: true });
    const schema = buildPublicFormSchema([f], new Set(['a']));
    expect(Object.keys(schema.shape)).not.toContain('a');
    // Empty value for a hidden required field must never fail.
    expect(schema.safeParse({}).success).toBe(true);
  });
});
