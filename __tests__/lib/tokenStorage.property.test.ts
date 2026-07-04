/**
 * __tests__/tokenStorage.property.test.ts
 * Feature: sprint-1-frontend-auth
 * Tests: Property 4, 5 — Token Storage invariants using fast-check
 * Requirements: 16.1, 16.2, 16.3, 16.5, 16.6
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';

// We import dynamically after stubbing globals to ensure the module
// sees our mocked localStorage.
import { saveToken, getToken, clearToken } from '@/lib/tokenStorage';

describe('Token Storage', () => {
  beforeEach(() => {
    // Provided by vitest.setup.ts — ensure we start clean
    localStorage.clear();
  });

  // ─── Property 4: Token Storage Round-Trip ──────────────────────────────────

  describe('Property 4: Token Storage Round-Trip', () => {
    it('saveToken then getToken returns the exact same string', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1 }), (token) => {
          saveToken(token);
          const retrieved = getToken();
          expect(retrieved).toBe(token);
        }),
        { numRuns: 200 }
      );
    });

    it('saveToken with empty string is a no-op — getToken returns null afterwards', () => {
      // Ensure no token set first
      clearToken();
      saveToken('');
      expect(getToken()).toBeNull();
    });
  });

  // ─── Property 5: Token Storage Clear Idempotence ───────────────────────────

  describe('Property 5: Token Storage Clear Idempotence', () => {
    it('clearToken always results in getToken returning null, regardless of initial state', () => {
      fc.assert(
        fc.property(
          fc.option(fc.string({ minLength: 1 }), { nil: null }),
          fc.integer({ min: 1, max: 5 }),
          (initialToken, clearCount) => {
            // Seed state
            if (initialToken !== null) {
              saveToken(initialToken);
            } else {
              clearToken();
            }

            // Call clearToken 1–5 times (idempotence)
            for (let i = 0; i < clearCount; i++) {
              clearToken();
            }

            expect(getToken()).toBeNull();
          }
        ),
        { numRuns: 200 }
      );
    });

    it('clearToken never throws', () => {
      expect(() => {
        clearToken();
        clearToken();
        clearToken();
      }).not.toThrow();
    });
  });

  // ─── Example-based unit tests ───────────────────────────────────────────────

  describe('Unit: saveToken / getToken / clearToken', () => {
    it('getToken returns null when nothing is stored', () => {
      clearToken();
      expect(getToken()).toBeNull();
    });

    it('saveToken stores a JWT and getToken retrieves it', () => {
      saveToken('my.jwt.token');
      expect(getToken()).toBe('my.jwt.token');
    });

    it('clearToken removes a previously stored token', () => {
      saveToken('some.token');
      clearToken();
      expect(getToken()).toBeNull();
    });

    it('saveToken does not throw when localStorage throws (QuotaExceededError)', () => {
      vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new DOMException('QuotaExceededError');
      });
      expect(() => saveToken('token')).not.toThrow();
      vi.restoreAllMocks();
    });
  });
});
