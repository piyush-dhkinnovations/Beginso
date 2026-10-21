/**
 * Pure rules behind the "Submitted response" layouts: which choice wins, what is shown or hidden, how wide an answer is,
 * and what text a search or a "Copy" works on. No React, so every rule is unit-tested on its own.
 */

import { isTopAnswer, type AnswerItem } from '@/lib/responseAnswers';
import { RESPONSE_LAYOUTS, type ResponseLayout, type ResponseViewSettings } from '@/types/responseView';

/** Everyone who has not chosen sees today's look. */
export const DEFAULT_VIEW: ResponseViewSettings = { layout: 'grid', density: 'comfortable', showEmpty: true, showNumbers: true };

export function isValidSettings(x: unknown): x is ResponseViewSettings {
  if (!x || typeof x !== 'object') return false;
  const v = x as Record<string, unknown>;
  return (
    RESPONSE_LAYOUTS.includes(v.layout as ResponseLayout) &&
    (v.density === 'comfortable' || v.density === 'compact') &&
    typeof v.showEmpty === 'boolean' &&
    typeof v.showNumbers === 'boolean'
  );
}

const pick = (v: ResponseViewSettings): ResponseViewSettings => ({ layout: v.layout, density: v.density, showEmpty: v.showEmpty, showNumbers: v.showNumbers });

/**
 * What to draw right now. A choice made on this device and not yet confirmed by the server (or one the server refused to save)
 * wins, so switching never flashes back. Then the server's answer, which already applies
 * personal choice for this form > personal choice for all forms > form default > Grid. Then the last answer
 * remembered on this device, so the page can paint before the request returns. Then Grid.
 */
export function resolveView(
  local: ResponseViewSettings | null | undefined,
  server: ResponseViewSettings | null | undefined,
  remembered: ResponseViewSettings | null | undefined
): ResponseViewSettings {
  return pick(local ?? server ?? remembered ?? DEFAULT_VIEW);
}

/** Below 768px only the List fits, whatever was chosen. */
export const effectiveLayout = (layout: ResponseLayout, narrow: boolean): ResponseLayout => (narrow ? 'list' : layout);

// ─── Remembered on this device, per form ─────────────────────────────────────

const storageKey = (formId: string) => `beginso:response-view:${formId}`;

export function readRememberedView(formId: string | undefined): ResponseViewSettings | null {
  if (!formId) return null;
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(storageKey(formId)) ?? 'null');
    return isValidSettings(parsed) ? pick(parsed) : null;
  } catch {
    return null;
  }
}

export function rememberView(formId: string | undefined, view: ResponseViewSettings): void {
  if (!formId) return;
  try {
    window.localStorage.setItem(storageKey(formId), JSON.stringify(pick(view)));
  } catch {
    /* private window or blocked storage: the choice simply is not remembered */
  }
}

// ─── Answers ────────────────────────────────────────────────────────────────

export const isEmptyItem = (item: AnswerItem): boolean => {
  if (item.files.length > 0) return false;
  const v = item.value;
  return v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0);
};

/** The plain text of an answer, for search and Copy. */
export function answerText(item: AnswerItem): string {
  if (item.files.length > 0) return item.files.map((f) => f.name).join(', ');
  const v = item.value;
  if (v === null || v === undefined) return '';
  if (Array.isArray(v)) return v.join(', ');
  return String(v);
}

// Types that need the full row; everything else can share a row. Longer text goes full width too.
const FULL_WIDTH_TYPES = new Set(['long_text', 'address', 'url', 'image_upload', 'file_upload', 'signature', 'checkbox', 'multiple_choice', 'matrix', 'ranking']);
export const LONG_ANSWER_CHARS = 60;

export function isFullWidthItem(item: AnswerItem): boolean {
  if (item.field && FULL_WIDTH_TYPES.has(item.field.type)) return true;
  if (item.files.length > 0) return true;
  const text = answerText(item);
  return text.length > LONG_ANSWER_CHARS || text.includes('\n');
}

export interface ArrangeOptions {
  showEmpty: boolean;
  query: string;
  /** False while the form definition is unavailable: then no answer can be called "from a removed question". */
  hasSchema: boolean;
}

export interface ArrangedAnswers {
  /** Images and links the form owner set to "Top of response". */
  top: AnswerItem[];
  main: AnswerItem[];
  /** Answers whose question was deleted or renamed - kept, shown last. */
  removed: AnswerItem[];
  /** Empty rows left out because "Show empty answers" is off. The count is always shown to the user. */
  hiddenEmpty: number;
  /** Questions with an answer, out of all questions on the form. */
  answered: number;
  total: number;
  /** Rows left after the search. */
  matches: number;
}

const matchesQuery = (item: AnswerItem, q: string): boolean =>
  !q || item.label.toLowerCase().includes(q) || answerText(item).toLowerCase().includes(q);

export function arrangeAnswers(items: AnswerItem[], { showEmpty, query, hasSchema }: ArrangeOptions): ArrangedAnswers {
  const q = query.trim().toLowerCase();
  const isRemoved = (i: AnswerItem) => hasSchema && !i.field && i.files.length === 0;

  const asked = items.filter((i) => i.field);
  const answered = asked.filter((i) => !isEmptyItem(i)).length;

  let hiddenEmpty = 0;
  const shown = items.filter((item) => {
    if (!showEmpty && isEmptyItem(item)) {
      hiddenEmpty += 1;
      return false;
    }
    return matchesQuery(item, q);
  });

  return {
    top: shown.filter((i) => !isRemoved(i) && isTopAnswer(i)),
    main: shown.filter((i) => !isRemoved(i) && !isTopAnswer(i)),
    removed: shown.filter(isRemoved),
    hiddenEmpty,
    answered,
    total: asked.length,
    matches: shown.length,
  };
}

/** Splits text around case-insensitive matches of `query`, for highlighting. Never builds HTML. */
export function splitMatches(text: string, query: string): { text: string; match: boolean }[] {
  const q = query.trim();
  if (!q) return [{ text, match: false }];
  const lower = text.toLowerCase();
  const needle = q.toLowerCase();
  const parts: { text: string; match: boolean }[] = [];
  let from = 0;
  for (let at = lower.indexOf(needle); at !== -1; at = lower.indexOf(needle, from)) {
    if (at > from) parts.push({ text: text.slice(from, at), match: false });
    parts.push({ text: text.slice(at, at + needle.length), match: true });
    from = at + needle.length;
  }
  if (from < text.length) parts.push({ text: text.slice(from), match: false });
  return parts.length > 0 ? parts : [{ text, match: false }];
}

/** Long text is clamped to about 8 lines with "Show more". Measured by content, not by layout, so it behaves the same everywhere. */
export const CLAMP_LINES = 8;
const CLAMP_CHARS = 480;
export const needsClamp = (text: string): boolean => text.length > CLAMP_CHARS || text.split('\n').length > CLAMP_LINES;
