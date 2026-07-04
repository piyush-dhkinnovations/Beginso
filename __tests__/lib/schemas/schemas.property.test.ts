/**
 * __tests__/schemas.property.test.ts
 * Feature: sprint-1-frontend-auth
 * Tests: Property 1, 2, 3, 9 — Zod schema invariants using fast-check
 * Requirements: 5.2, 5.3, 5.4, 7.2, 5.10
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { signupSchema } from '@/lib/schemas/signupSchema';
import { loginSchema } from '@/lib/schemas/loginSchema';

// ─── Arbitraries ───────────────────────────────────────────────────────────────

/** A valid RFC-ish email arbitrary — guaranteed safe local + domain + tld */
const validEmailArb = fc
  .tuple(
    fc.stringMatching(/^[a-zA-Z0-9]{3,12}$/),
    fc.constantFrom('example', 'testco', 'acme', 'company', 'myorg'),
    fc.constantFrom('com', 'org', 'net', 'io', 'dev')
  )
  .map(([local, domain, tld]) => `${local}@${domain}.${tld}`);


/** Strings that are definitely NOT valid emails (no '@' character) */
const invalidEmailNoAtArb = fc.string({ minLength: 1, maxLength: 50 }).filter((s) => !s.includes('@'));

/** Strings with '@' but missing a proper domain */
const invalidEmailNoDomainArb = fc
  .tuple(fc.string({ minLength: 1, maxLength: 20 }), fc.string({ minLength: 0, maxLength: 5 }))
  .map(([local, junk]) => `${local}@${junk}`) // e.g. "foo@" or "foo@no-tld"
  .filter((s) => !/^[^@]+@[^@]+\.[^@]{2,}$/.test(s));

/** Passwords shorter than 8 characters */
const tooShortPasswordArb = fc.string({ minLength: 0, maxLength: 7 });

/** Passwords longer than 128 characters */
const tooLongPasswordArb = fc.string({ minLength: 129, maxLength: 200 });

/** Valid name (2–100 chars, no leading/trailing whitespace, not blank) */
const validNameArb = fc
  .stringMatching(/^[a-zA-Z][a-zA-Z0-9 ]{1,98}[a-zA-Z0-9]$/);

/** Valid password (8–128 chars) */
const validPasswordArb = fc.string({ minLength: 8, maxLength: 128 });

// ─── Property 1: Zod Schemas Reject Invalid Emails ────────────────────────────

describe('Property 1: Zod Schemas Reject Invalid Emails', () => {
  it('signupSchema rejects emails without @', () => {
    fc.assert(
      fc.property(
        validNameArb,
        invalidEmailNoAtArb,
        validPasswordArb,
        (name, email, pw) => {
          const result = signupSchema.safeParse({
            name,
            email,
            password: pw,
            confirmPassword: pw,
          });
          expect(result.success).toBe(false);
          if (!result.success) {
            const emailError = result.error.issues.find((i) => i.path.includes('email'));
            expect(emailError).toBeDefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('signupSchema rejects emails with @ but no valid domain', () => {
    fc.assert(
      fc.property(
        validNameArb,
        invalidEmailNoDomainArb,
        validPasswordArb,
        (name, email, pw) => {
          const result = signupSchema.safeParse({
            name,
            email,
            password: pw,
            confirmPassword: pw,
          });
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('loginSchema rejects emails without @', () => {
    fc.assert(
      fc.property(invalidEmailNoAtArb, validPasswordArb, (email, pw) => {
        const result = loginSchema.safeParse({ email, password: pw });
        expect(result.success).toBe(false);
        if (!result.success) {
          const emailError = result.error.issues.find((i) => i.path.includes('email'));
          expect(emailError).toBeDefined();
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Property 2: Signup Schema Rejects Out-of-Range Passwords ─────────────────

describe('Property 2: Signup Schema Rejects Out-of-Range Passwords', () => {
  it('rejects passwords shorter than 8 characters', () => {
    fc.assert(
      fc.property(validNameArb, validEmailArb, tooShortPasswordArb, (name, email, pw) => {
        const result = signupSchema.safeParse({
          name,
          email,
          password: pw,
          confirmPassword: pw,
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          const pwError = result.error.issues.find((i) => i.path.includes('password'));
          expect(pwError).toBeDefined();
        }
      }),
      { numRuns: 100 }
    );
  });

  it('rejects passwords longer than 128 characters', () => {
    fc.assert(
      fc.property(validNameArb, validEmailArb, tooLongPasswordArb, (name, email, pw) => {
        const result = signupSchema.safeParse({
          name,
          email,
          password: pw,
          confirmPassword: pw,
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          const pwError = result.error.issues.find((i) => i.path.includes('password'));
          expect(pwError).toBeDefined();
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Property 3: Signup Schema Rejects Password Mismatch ──────────────────────

describe('Property 3: Signup Schema Rejects Password Mismatch', () => {
  it('rejects when password !== confirmPassword', () => {
    fc.assert(
      fc.property(
        validNameArb,
        validEmailArb,
        validPasswordArb,
        validPasswordArb,
        (name, email, pw1, pw2) => {
          fc.pre(pw1 !== pw2); // only run when they differ
          const result = signupSchema.safeParse({
            name,
            email,
            password: pw1,
            confirmPassword: pw2,
          });
          expect(result.success).toBe(false);
          if (!result.success) {
            const mismatchError = result.error.issues.find((i) =>
              i.path.includes('confirmPassword')
            );
            expect(mismatchError).toBeDefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 9: Signup Schema Accepts All Valid Inputs ───────────────────────

describe('Property 9: Signup Schema Accepts All Valid Inputs', () => {
  it('passes for valid name / email / password / confirmPassword combos', () => {
    fc.assert(
      fc.property(validNameArb, validEmailArb, validPasswordArb, (name, email, pw) => {
        const result = signupSchema.safeParse({
          name,
          email,
          password: pw,
          confirmPassword: pw,
        });
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});
