import { describe, it, expect } from 'vitest';
import { summariseAudit, buildInfo } from '../../scripts/write-build-info.mjs';

describe('summariseAudit', () => {
  it('reads the totals from npm audit --json output', () => {
    expect(summariseAudit({ metadata: { vulnerabilities: { info: 0, low: 1, moderate: 0, high: 2, critical: 1, total: 4 } } })).toEqual({ total: 4, critical: 1, high: 2 });
  });

  it('treats a missing severity as zero', () => {
    expect(summariseAudit({ metadata: { vulnerabilities: { total: 0 } } })).toEqual({ total: 0, critical: 0, high: 0 });
  });

  it('returns null for anything that is not an audit report, never a made-up zero', () => {
    expect(summariseAudit(null)).toBeNull();
    expect(summariseAudit({})).toBeNull();
    expect(summariseAudit({ metadata: { vulnerabilities: { total: 'x' } } })).toBeNull();
  });
});

describe('buildInfo', () => {
  it('prefers the Vercel commit variables and keeps only the first line of the message', () => {
    const info = buildInfo({ VERCEL_GIT_COMMIT_SHA: 'abcdef1234567890', VERCEL_GIT_COMMIT_MESSAGE: 'Add storage bar\n\nlong body' }, () => null);
    expect(info.commit).toBe('abcdef1');
    expect(info.commitMessage).toBe('Add storage bar');
    expect(typeof info.builtAt).toBe('string');
    expect(info.audit).toBeNull();
  });

  it('attaches the audit summary with a timestamp when npm audit answers', () => {
    const json = JSON.stringify({ metadata: { vulnerabilities: { total: 2, high: 1, critical: 0 } } });
    const info = buildInfo({ VERCEL_GIT_COMMIT_SHA: 'abcdef1234567890' }, () => json);
    expect(info.audit).toMatchObject({ total: 2, high: 1, critical: 0 });
    expect(typeof info.audit?.checkedAt).toBe('string');
  });
});
