import { beforeEach, describe, expect, it } from 'vitest';
import {
  parseStoredRange,
  rangeToStored,
  readStoredRangeRaw,
  serializeStoredRange,
  storedRangeKey,
  storedToRange,
  subscribeStoredRange,
  writeStoredRange,
} from '@/lib/storedDateRange';
import { DEFAULT_RANGE_PRESET, resolveDateRangePreset, resolveEffectiveDateRange } from '@/lib/dateRange';

describe('the default range', () => {
  it('is All time', () => {
    expect(DEFAULT_RANGE_PRESET).toBe('all');
    expect(resolveEffectiveDateRange(null, null)).toEqual({ from: undefined, to: undefined, preset: 'all' });
  });

  it('an explicit "all" and an explicit range still mean what they say', () => {
    expect(resolveEffectiveDateRange('all', 'all').preset).toBe('all');
    const thirty = resolveDateRangePreset('30d');
    expect(resolveEffectiveDateRange(thirty.from!, thirty.to!).preset).toBe('30d');
  });
});

describe('storedRangeKey', () => {
  it('is one per form, and one per workspace for the workspace-wide page', () => {
    expect(storedRangeKey('f1')).toBe('beginso:analytics-range:f1');
    expect(storedRangeKey(undefined, 'acme')).toBe('beginso:analytics-range:workspace:acme');
    expect(storedRangeKey('f1')).not.toBe(storedRangeKey('f2'));
  });
});

describe('parseStoredRange', () => {
  it.each([null, '', 'not json', '{}', '{"preset":"yesterday"}', '{"preset":"custom"}', '{"preset":"custom","from":"nope","to":"x"}', '"30d"', 'null'])(
    'ignores %j',
    (raw) => expect(parseStoredRange(raw as string | null)).toBeNull()
  );

  it('reads a preset, a custom range, and the compare flag', () => {
    expect(parseStoredRange('{"preset":"30d","compare":false}')).toEqual({ preset: '30d', compare: false });
    expect(parseStoredRange('{"preset":"all"}')).toEqual({ preset: 'all', compare: undefined });
    const custom = parseStoredRange('{"preset":"custom","from":"2026-09-01T00:00:00.000Z","to":"2026-09-30T23:59:59.999Z"}');
    expect(custom).toMatchObject({ preset: 'custom', from: '2026-09-01T00:00:00.000Z', to: '2026-09-30T23:59:59.999Z' });
  });

  it('drops a compare flag that is not a boolean', () => {
    expect(parseStoredRange('{"preset":"7d","compare":"yes"}')).toEqual({ preset: '7d', compare: undefined });
  });
});

describe('what is remembered', () => {
  it('a preset is remembered as the preset, so "Last 30 days" is still the last 30 days tomorrow', () => {
    const thirty = resolveDateRangePreset('30d');
    const stored = rangeToStored(thirty, true);
    expect(stored).toEqual({ preset: '30d', compare: true });
    expect(storedToRange(stored)).toEqual({ ...thirty, preset: '30d' });
    expect(serializeStoredRange(stored)).not.toContain('20'); // no dates written for a preset
  });

  it('All time has no bounds', () => {
    expect(rangeToStored({}, true)).toEqual({ preset: 'all', compare: true });
    expect(storedToRange({ preset: 'all' })).toEqual({ from: undefined, to: undefined, preset: 'all' });
  });

  it('a custom range keeps its two dates', () => {
    const range = { from: '2026-09-01T00:00:00.000Z', to: '2026-09-15T23:59:59.999Z' };
    const stored = rangeToStored(range, false);
    expect(stored).toEqual({ preset: 'custom', ...range, compare: false });
    expect(storedToRange(stored)).toEqual({ ...range, preset: 'custom' });
  });
});

describe('browser storage', () => {
  beforeEach(() => window.localStorage.clear());

  it('writes and reads back, and tells subscribers', () => {
    let calls = 0;
    const stop = subscribeStoredRange(() => (calls += 1));
    writeStoredRange('k', { preset: '7d', compare: true });
    expect(parseStoredRange(readStoredRangeRaw('k'))).toEqual({ preset: '7d', compare: true });
    expect(calls).toBe(1);
    stop();
    writeStoredRange('k', { preset: '90d' });
    expect(calls).toBe(1);
  });

  it('does not rewrite (or notify about) an unchanged value', () => {
    let calls = 0;
    const stop = subscribeStoredRange(() => (calls += 1));
    writeStoredRange('k', { preset: '7d' });
    writeStoredRange('k', { preset: '7d' });
    expect(calls).toBe(1);
    stop();
  });

  it('never throws when storage is blocked', () => {
    const get = Storage.prototype.getItem;
    const set = Storage.prototype.setItem;
    Storage.prototype.getItem = () => {
      throw new Error('blocked');
    };
    Storage.prototype.setItem = () => {
      throw new Error('blocked');
    };
    expect(readStoredRangeRaw('k')).toBeNull();
    expect(() => writeStoredRange('k', { preset: '7d' })).not.toThrow();
    Storage.prototype.getItem = get;
    Storage.prototype.setItem = set;
  });
});
