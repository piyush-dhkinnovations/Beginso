/**
 * Feature: sprint-3-public-form
 * Property-based tests (fast-check) for the pure logic/validation functions.
 * Requirements: 5.1, 5.3, 5.5, 4.31, 3.4, 6.4
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { buildAnswers, evaluateLogicRules } from '@/lib/logicEngine';
import { buildPublicFormSchema } from '@/lib/schemas/publicFormSchema';
import { validateFile } from '@/lib/validateFile';
import type { FormField } from '@/types/form';

// ─── Arbitraries ────────────────────────────────────────────────────────────────

const fieldIdArb = fc.uuid();

const logicRuleArb = fc.record({
  condition: fc.record({
    fieldId: fieldIdArb,
    operator: fc.constant('equals' as const),
    value: fc.string({ minLength: 0, maxLength: 20 }),
  }),
  action: fc.constantFrom('show' as const, 'hide' as const),
  targetFieldId: fieldIdArb,
});

/** Minimal FormField shape — short_text/email/number cover both text and coerced-number validation paths. */
const formFieldArb = fc.record({
  fieldId: fieldIdArb,
  pageId: fieldIdArb,
  type: fc.constantFrom('short_text' as const, 'email' as const, 'number' as const),
  label: fc.string({ minLength: 1, maxLength: 40 }),
  required: fc.boolean(),
  deleted: fc.constant(false),
  order: fc.nat({ max: 20 }),
  logicRules: fc.array(logicRuleArb, { maxLength: 3 }),
  placeholder: fc.option(fc.string(), { nil: undefined }),
  helpText: fc.option(fc.string(), { nil: undefined }),
});

// ─── Property 1: Hidden Fields Are Never Submitted ───────────────────────────────

describe('Property 1: Hidden Fields Are Never Submitted', () => {
  it('hidden fields do not appear in buildAnswers() output', () => {
    fc.assert(
      fc.property(fc.array(formFieldArb, { minLength: 2, maxLength: 10 }), (fields) => {
        const allIds = fields.map((f) => f.fieldId);
        const answers = Object.fromEntries(allIds.map((id) => [id, 'some-value']));
        const hiddenIds = new Set([fields[0].fieldId]);
        const result = buildAnswers(fields as FormField[], hiddenIds, answers);
        const resultIds = result.map((a) => a.fieldId);
        for (const hiddenId of hiddenIds) {
          expect(resultIds).not.toContain(hiddenId);
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Property 2: Hidden Fields Are Never Required ────────────────────────────────

describe('Property 2: Hidden Fields Are Never Required', () => {
  it('buildPublicFormSchema does not require hidden fields', () => {
    fc.assert(
      fc.property(fc.array(formFieldArb, { minLength: 1, maxLength: 8 }), (fields) => {
        const requiredFields = fields.map((f) => ({ ...f, required: true }));
        const hiddenIds = new Set(requiredFields.map((f) => f.fieldId));
        const schema = buildPublicFormSchema(requiredFields as FormField[], hiddenIds);
        const emptyValues = Object.fromEntries(requiredFields.map((f) => [f.fieldId, '']));
        const result = schema.safeParse(emptyValues);
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Property 3: Logic Rule Evaluation Is Deterministic ──────────────────────────

describe('Property 3: Logic Rule Evaluation Is Deterministic', () => {
  it('evaluateLogicRules returns the same result on two consecutive calls', () => {
    fc.assert(
      fc.property(
        fc.array(formFieldArb, { minLength: 0, maxLength: 10 }),
        fc.dictionary(fc.uuid(), fc.string()),
        (fields, answers) => {
          const result1 = evaluateLogicRules(fields as FormField[], answers);
          const result2 = evaluateLogicRules(fields as FormField[], answers);
          expect(result1.size).toBe(result2.size);
          for (const id of result1) {
            expect(result2.has(id)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 4: File Size Rejection Is Consistent ───────────────────────────────

describe('Property 4: File Size Rejection Is Consistent', () => {
  it('validateFile rejects any file > 100 MB regardless of type', () => {
    const MAX = 100 * 1024 * 1024;
    fc.assert(
      fc.property(
        fc.integer({ min: MAX + 1, max: MAX * 10 }),
        fc.constantFrom('application/pdf', 'image/jpeg', 'video/mp4', 'text/plain', 'application/zip'),
        (size, mimeType) => {
          const file = { size, type: mimeType, name: 'test-file' } as File;
          const error = validateFile(file);
          expect(error).not.toBeNull();
          expect(error).toContain('100 MB');
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 5: Page Validation Blocks Navigation ───────────────────────────────

describe('Property 5: Page Validation Blocks Navigation', () => {
  // Tests the schema-level contract (Zod safeParse with empty required fields) — the
  // actual RHF trigger() call is a UI concern; the schema is the validation source of truth.
  it('required visible fields with empty values fail Zod validation', () => {
    fc.assert(
      fc.property(
        fc.array(formFieldArb.map((f) => ({ ...f, required: true })), { minLength: 1, maxLength: 5 }),
        (fields) => {
          const hiddenIds = new Set<string>();
          const schema = buildPublicFormSchema(fields as FormField[], hiddenIds);
          const emptyValues = Object.fromEntries(fields.map((f) => [f.fieldId, '']));
          const result = schema.safeParse(emptyValues);
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 6: Multi-Page Submission Includes All Pages ────────────────────────

describe('Property 6: Multi-Page Submission Includes All Pages', () => {
  it('buildAnswers includes fields from all pages that have at least one field', () => {
    fc.assert(
      fc.property(
        fc.array(fc.uuid(), { minLength: 2, maxLength: 5 }).chain((pageIds) =>
          fc.tuple(
            fc.constant(pageIds),
            fc.array(
              formFieldArb.chain((f) => fc.constantFrom(...pageIds).map((pageId) => ({ ...f, pageId }))),
              { minLength: pageIds.length, maxLength: pageIds.length * 3 }
            )
          )
        ),
        ([pageIds, fields]) => {
          const hiddenIds = new Set<string>();
          const answers = Object.fromEntries(fields.map((f) => [f.fieldId, 'answer']));
          const result = buildAnswers(fields as FormField[], hiddenIds, answers);
          // Answer no longer carries pageId (matches the backend's documented schema) —
          // correlate each result entry back to its source field's page instead.
          const fieldIdToPageId = new Map(fields.map((f) => [f.fieldId, f.pageId]));
          const resultPageIds = new Set(result.map((a) => fieldIdToPageId.get(a.fieldId)));
          for (const pid of pageIds) {
            const pageHasFields = fields.some((f) => f.pageId === pid && !f.deleted);
            if (pageHasFields) {
              expect(resultPageIds.has(pid)).toBe(true);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
