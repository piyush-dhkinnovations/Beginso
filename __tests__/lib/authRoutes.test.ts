/**
 * Sprint 9 task 3.5 / requirements §7.5.1, §14: sanitizeNextParam is the open-redirect guard
 * behind ?next= on /login and /signup — a crafted external or protocol-relative value must
 * never reach router.replace/login().
 */

import { describe, it, expect } from 'vitest';
import { sanitizeNextParam } from '@/lib/authRoutes';

describe('sanitizeNextParam', () => {
  it('accepts a plain internal path', () => {
    expect(sanitizeNextParam('/invite/abc123')).toBe('/invite/abc123');
  });

  it('rejects null (no ?next= present)', () => {
    expect(sanitizeNextParam(null)).toBeUndefined();
  });

  it('rejects a protocol-relative URL (//evil.example.com)', () => {
    expect(sanitizeNextParam('//evil.example.com')).toBeUndefined();
  });

  it('rejects an absolute external URL', () => {
    expect(sanitizeNextParam('https://evil.example.com')).toBeUndefined();
  });

  it('rejects a value with no leading slash', () => {
    expect(sanitizeNextParam('dashboard')).toBeUndefined();
  });

  // A2-006: browsers read "/\" as "//", so a backslash must never get through.
  it.each(['/\\evil.example.com', '/\\/evil.example.com', '/a\\b', '\\evil.example.com'])('rejects the backslash form %s', (value) => {
    expect(sanitizeNextParam(value)).toBeUndefined();
  });

  it('still accepts an internal path with a query string', () => {
    expect(sanitizeNextParam('/forms/1/inbox?tab=x')).toBe('/forms/1/inbox?tab=x');
  });
});
