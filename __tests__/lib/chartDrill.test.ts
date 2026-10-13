import { describe, it, expect } from 'vitest';
import { drillHref } from '@/lib/chartDrill';
import { toSegments, MIN_TREND_POINTS, NOT_ENOUGH_DATA } from '@/lib/chartSegments';

describe('drillHref', () => {
  it('links to the form inbox with formId and field', () => {
    const url = drillHref({ scope: 'personal', formId: 'f1', fieldId: 'q1' });
    const [path, query] = url.split('?');
    expect(path).toBe('/forms/f1/inbox');
    const p = new URLSearchParams(query);
    expect(p.get('formId')).toBe('f1');
    expect(p.get('field')).toBe('q1');
    expect(p.has('value')).toBe(false);
    expect(p.has('ws')).toBe(false);
  });

  it('keeps an empty-string value (answered with empty) but omits undefined', () => {
    expect(new URLSearchParams(drillHref({ scope: 'personal', formId: 'f', fieldId: 'q', value: '' }).split('?')[1]).get('value')).toBe('');
  });

  it('adds value, granularity, range and the workspace scope', () => {
    const p = new URLSearchParams(
      drillHref({ scope: 'acme', formId: 'f', fieldId: 'q', value: '2026-W40', granularity: 'week', from: '2026-09-01', to: '2026-09-30' }).split('?')[1],
    );
    expect(p.get('value')).toBe('2026-W40');
    expect(p.get('granularity')).toBe('week');
    expect(p.get('from')).toBe('2026-09-01');
    expect(p.get('to')).toBe('2026-09-30');
    expect(p.get('ws')).toBe('acme');
  });

  it('encodes special characters in values', () => {
    const url = drillHref({ scope: 'personal', formId: 'f', fieldId: 'q', value: 'a&b=c' });
    expect(url).not.toContain('a&b=c');
    expect(new URLSearchParams(url.split('?')[1]).get('value')).toBe('a&b=c');
  });
});

describe('toSegments', () => {
  it('computes counts, percentages and default keys', () => {
    const s = toSegments([{ label: 'A', value: 1 }, { label: 'B', value: 3 }]);
    expect(s.map((x) => x.key)).toEqual(['0:A', '1:B']);
    expect(s.map((x) => x.percentage)).toEqual([25, 75]);
    expect(s.map((x) => x.text)).toEqual(['1', '3']);
    expect(s[1].count).toBe(3);
  });

  it('uses the given key and formats thousands', () => {
    const [s] = toSegments([{ key: 'k', label: 'A', value: 1234 }]);
    expect(s.key).toBe('k');
    expect(s.text).toBe((1234).toLocaleString());
  });

  it('percent mode shows whole numbers without decimals and fractions with one', () => {
    const s = toSegments([{ label: 'A', value: 1 }, { label: 'B', value: 2 }], 'percent');
    expect(s.map((x) => x.text)).toEqual(['33.3%', '66.7%']);
    expect(toSegments([{ label: 'A', value: 1 }, { label: 'B', value: 1 }], 'percent').map((x) => x.text)).toEqual(['50%', '50%']);
  });

  it('zero total gives 0 percentage, no NaN', () => {
    const [s] = toSegments([{ label: 'A', value: 0 }], 'percent');
    expect(s.percentage).toBe(0);
    expect(s.text).toBe('0%');
  });

  it('exposes the minimum-data rule constants', () => {
    expect(MIN_TREND_POINTS).toBe(10);
    expect(NOT_ENOUGH_DATA).toMatch(/not enough data/i);
  });
});
