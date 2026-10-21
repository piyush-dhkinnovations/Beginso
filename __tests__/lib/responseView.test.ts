import { beforeEach, describe, expect, it } from 'vitest';
import {
  CLAMP_LINES,
  DEFAULT_VIEW,
  answerText,
  arrangeAnswers,
  effectiveLayout,
  isEmptyItem,
  isFullWidthItem,
  isValidSettings,
  needsClamp,
  readRememberedView,
  rememberView,
  resolveView,
  splitMatches,
} from '@/lib/responseView';
import type { AnswerItem } from '@/lib/responseAnswers';
import type { FormField } from '@/types/form';
import type { ResponseViewSettings } from '@/types/responseView';
import { SUBMITTED_FIELDS, TOTAL_QUESTIONS, UNANSWERED, submittedItems } from '../fixtures/submittedResponse';

const LIST: ResponseViewSettings = { layout: 'list', density: 'compact', showEmpty: false, showNumbers: false };
const TABLE: ResponseViewSettings = { layout: 'table', density: 'comfortable', showEmpty: true, showNumbers: true };
const field = (o: Record<string, unknown>) => o as unknown as FormField;
const item = (o: Partial<AnswerItem>): AnswerItem => ({ key: 'k', number: 1, label: 'Q', value: '', files: [], ...o });

describe('resolveView', () => {
  it('a choice made here and not yet confirmed wins over the server and the remembered one', () => {
    expect(resolveView(LIST, TABLE, DEFAULT_VIEW)).toEqual(LIST);
  });

  it('then the server answer, then the one remembered on this device, then Grid', () => {
    expect(resolveView(null, TABLE, LIST)).toEqual(TABLE);
    expect(resolveView(null, null, LIST)).toEqual(LIST);
    expect(resolveView(null, null, null)).toEqual(DEFAULT_VIEW);
    expect(DEFAULT_VIEW.layout).toBe('grid');
  });

  it('returns only the four settings (no source or scope leaks through)', () => {
    const fromServer = { ...TABLE, source: 'personal', scope: 'x' } as unknown as ResponseViewSettings;
    expect(Object.keys(resolveView(null, fromServer, null)).sort()).toEqual(['density', 'layout', 'showEmpty', 'showNumbers']);
  });
});

describe('isValidSettings / effectiveLayout', () => {
  it.each([
    [{ ...TABLE }, true],
    [{ ...TABLE, layout: 'sections' }, false],
    [{ ...TABLE, layout: 'form' }, false],
    [{ ...TABLE, density: 'huge' }, false],
    [{ ...TABLE, showEmpty: 'yes' }, false],
    [null, false],
    ['grid', false],
  ])('%j -> %s', (value, ok) => expect(isValidSettings(value)).toBe(ok));

  it('below 768px every layout shows as a list', () => {
    expect(effectiveLayout('grid', true)).toBe('list');
    expect(effectiveLayout('table', true)).toBe('list');
    expect(effectiveLayout('table', false)).toBe('table');
  });
});

describe('remembered choice on this device', () => {
  beforeEach(() => window.localStorage.clear());

  it('round-trips per form', () => {
    rememberView('f1', TABLE);
    expect(readRememberedView('f1')).toEqual(TABLE);
    expect(readRememberedView('f2')).toBeNull();
  });

  it('ignores anything that is not a valid choice', () => {
    window.localStorage.setItem('beginso:response-view:f1', '{"layout":"sections"}');
    expect(readRememberedView('f1')).toBeNull();
    window.localStorage.setItem('beginso:response-view:f1', 'not json');
    expect(readRememberedView('f1')).toBeNull();
  });

  it('never throws when storage is blocked', () => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error('blocked');
    };
    expect(() => rememberView('f1', TABLE)).not.toThrow();
    Storage.prototype.setItem = original;
  });
});

describe('answers', () => {
  it('isEmptyItem: empty text, empty list and no files are empty; a file is an answer', () => {
    expect(isEmptyItem(item({ value: '' }))).toBe(true);
    expect(isEmptyItem(item({ value: [] }))).toBe(true);
    expect(isEmptyItem(item({ value: null }))).toBe(true);
    expect(isEmptyItem(item({ value: '0' }))).toBe(false);
    expect(isEmptyItem(item({ value: null, files: [{ id: 'a', name: 'a.pdf' } as never] }))).toBe(false);
  });

  it('answerText joins lists and file names', () => {
    expect(answerText(item({ value: ['Red', 'Blue'] }))).toBe('Red, Blue');
    expect(answerText(item({ value: 42 as never }))).toBe('42');
    expect(answerText(item({ files: [{ id: 'a', name: 'a.pdf' } as never, { id: 'b', name: 'b.png' } as never] }))).toBe('a.pdf, b.png');
  });

  it('full width: long text types, files, links, and anything over 60 characters', () => {
    for (const type of ['long_text', 'address', 'url', 'file_upload', 'image_upload', 'signature', 'checkbox', 'multiple_choice', 'matrix', 'ranking']) {
      expect(isFullWidthItem(item({ field: field({ type }), value: 'x' }))).toBe(true);
    }
    expect(isFullWidthItem(item({ field: field({ type: 'short_text' }), value: 'x'.repeat(60) }))).toBe(false);
    expect(isFullWidthItem(item({ field: field({ type: 'short_text' }), value: 'x'.repeat(61) }))).toBe(true);
    expect(isFullWidthItem(item({ field: field({ type: 'short_text' }), value: 'a\nb' }))).toBe(true);
    expect(isFullWidthItem(item({ field: field({ type: 'short_text' }), value: 'short' }))).toBe(false);
  });

  it('clamps long text by content, not by layout', () => {
    expect(needsClamp('short')).toBe(false);
    expect(needsClamp('x'.repeat(481))).toBe(true);
    expect(needsClamp(Array.from({ length: CLAMP_LINES + 1 }, () => 'a').join('\n'))).toBe(true);
    expect(needsClamp(Array.from({ length: CLAMP_LINES }, () => 'a').join('\n'))).toBe(false);
  });

  it('splitMatches marks case-insensitive matches and returns plain text parts', () => {
    expect(splitMatches('Night Train to Pune', 'train')).toEqual([
      { text: 'Night ', match: false },
      { text: 'Train', match: true },
      { text: ' to Pune', match: false },
    ]);
    expect(splitMatches('abc', '')).toEqual([{ text: 'abc', match: false }]);
    expect(splitMatches('<b>x</b>', 'b')).toEqual([
      { text: '<', match: false },
      { text: 'b', match: true },
      { text: '>x</', match: false },
      { text: 'b', match: true },
      { text: '>', match: false },
    ]);
  });
});

describe('arrangeAnswers on a real-shaped 39-question response', () => {
  const items = submittedItems();
  const base = { query: '', hasSchema: true } as const;

  it('counts answered questions out of all questions', () => {
    const r = arrangeAnswers(items, { ...base, showEmpty: true });
    expect(r.total).toBe(TOTAL_QUESTIONS);
    expect(r.answered).toBe(TOTAL_QUESTIONS - UNANSWERED);
    expect(r.hiddenEmpty).toBe(0);
  });

  it('with "show empty answers" off, hides exactly the unanswered rows and reports how many', () => {
    const shown = arrangeAnswers(items, { ...base, showEmpty: true });
    const hidden = arrangeAnswers(items, { ...base, showEmpty: false });
    expect(UNANSWERED).toBeGreaterThan(0);
    expect(hidden.hiddenEmpty).toBe(UNANSWERED);
    expect(hidden.top.length + hidden.main.length).toBe(shown.top.length + shown.main.length - UNANSWERED);
    // the count is about the form, not about what is shown
    expect(hidden.answered).toBe(shown.answered);
  });

  it('every answer is in exactly one of top, main or removed when nothing is hidden', () => {
    const r = arrangeAnswers(items, { ...base, showEmpty: true });
    expect(r.top.length + r.main.length + r.removed.length).toBe(items.length);
    expect(r.top.map((i) => i.label)).toEqual(['Upload your film poster']);
  });

  it('search matches a label or an answer, ignoring case, and keeps the empty count', () => {
    expect(arrangeAnswers(items, { ...base, showEmpty: true, query: 'director' }).matches).toBe(1);
    expect(arrangeAnswers(items, { ...base, showEmpty: true, query: 'BLUE DOOR' }).matches).toBe(1);
    expect(arrangeAnswers(items, { ...base, showEmpty: true, query: 'zzz-no-such-text' }).matches).toBe(0);
    expect(arrangeAnswers(items, { ...base, showEmpty: false, query: 'zzz' }).hiddenEmpty).toBe(UNANSWERED);
  });

  it('puts answers of a removed question last, and only when the form definition is known', () => {
    const withOrphan = submittedItems({ ...Object.fromEntries(items.map((i) => [i.label, 'x'])), 'Old question': 'kept' });
    const known = arrangeAnswers(withOrphan, { ...base, showEmpty: true });
    expect(known.removed.map((i) => i.label)).toEqual(['Old question']);
    expect(known.main.some((i) => i.label === 'Old question')).toBe(false);
    const unknown = arrangeAnswers(withOrphan, { ...base, showEmpty: true, hasSchema: false });
    expect(unknown.removed).toEqual([]);
  });

  it('answers whose question was removed do not count as questions', () => {
    const withOrphan = submittedItems({ 'Old question': 'kept' });
    expect(arrangeAnswers(withOrphan, { ...base, showEmpty: true }).total).toBe(SUBMITTED_FIELDS.length);
  });
});
