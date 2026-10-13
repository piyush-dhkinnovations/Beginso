import { describe, it, expect } from 'vitest';
import { COUNTRY_CODES, DEFAULT_COUNTRY, splitPhone, joinPhone } from '@/lib/countryCodes';

describe('COUNTRY_CODES', () => {
  it('has unique ISO codes and numeric dial codes, default included', () => {
    const isos = COUNTRY_CODES.map(([c]) => c);
    expect(new Set(isos).size).toBe(isos.length);
    expect(COUNTRY_CODES.every(([, , d]) => /^\d{1,4}$/.test(d))).toBe(true);
    expect(isos).toContain(DEFAULT_COUNTRY);
  });
});

describe('splitPhone', () => {
  it('splits an E.164 number', () => {
    expect(splitPhone('+919876543210')).toEqual({ country: 'IN', number: '9876543210' });
    expect(splitPhone('+44 7911 123456')).toEqual({ country: 'GB', number: '7911123456' });
  });

  it('prefers the longest dial code (Jamaica 1876 over US 1)', () => {
    expect(splitPhone('+18765551234')).toEqual({ country: 'JM', number: '5551234' });
  });

  it('treats a number with no plus as local, using the fallback country', () => {
    expect(splitPhone(' 98765 ')).toEqual({ country: 'IN', number: '98765' });
    expect(splitPhone('555', 'US')).toEqual({ country: 'US', number: '555' });
  });

  it('falls back when no dial code matches', () => {
    expect(splitPhone('+0000', 'US')).toEqual({ country: 'US', number: '0000' });
  });
});

describe('joinPhone', () => {
  it('joins country dial code and digits', () => {
    expect(joinPhone('US', '(555) 123-4567')).toBe('+15551234567');
    expect(joinPhone('IN', '98765 43210')).toBe('+919876543210');
  });

  it('returns empty string when there are no digits', () => {
    expect(joinPhone('IN', '')).toBe('');
    expect(joinPhone('IN', 'abc')).toBe('');
  });

  it('defaults to +91 for an unknown country', () => {
    expect(joinPhone('ZZ', '123')).toBe('+91123');
  });

  it('round-trips with splitPhone', () => {
    const joined = joinPhone('JM', '5551234');
    expect(splitPhone(joined)).toEqual({ country: 'JM', number: '5551234' });
  });
});
