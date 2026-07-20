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

  it('skips hidden fields entirely — no key in the resulting schema shape', () => {
    const f = field({ fieldId: 'a', pageId: 'p1', type: 'short_text', required: true });
    const schema = buildPublicFormSchema([f], new Set(['a']));
    expect(Object.keys(schema.shape)).not.toContain('a');
    // Empty value for a hidden required field must never fail.
    expect(schema.safeParse({}).success).toBe(true);
  });
});
