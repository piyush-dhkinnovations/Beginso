import { describe, expect, it } from 'vitest';
import nextConfig from '../next.config';

type HeaderRule = {
  source: string;
  headers: Array<{ key: string; value: string }>;
};

describe('security headers', () => {
  it('allows the Firebase Google sign-in bootstrap without weakening popup isolation', async () => {
    const getHeaders = nextConfig.headers as (() => Promise<HeaderRule[]>) | undefined;
    expect(getHeaders).toBeTypeOf('function');

    const rules = await getHeaders!();
    const headers = rules.find((rule) => rule.source === '/(.*)')?.headers;
    const headerValue = (key: string) => headers?.find((header) => header.key === key)?.value;
    const csp = headerValue('Content-Security-Policy');

    expect(csp).toContain('https://apis.google.com');
    expect(csp).toContain('https://accounts.google.com');
    expect(csp).toContain("frame-ancestors 'none'");
    expect(headerValue('Cross-Origin-Opener-Policy')).toBe('same-origin-allow-popups');
  });
});
