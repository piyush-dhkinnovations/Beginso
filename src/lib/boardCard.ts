import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { buildAnswerKeyMap } from '@/lib/answerKeys';
import type { FormField } from '@/types/form';
import type { ResponseAnswers } from '@/types/response';

/**
 * What a Board card shows, chosen per form by whoever is looking at it: `title` is `auto` (the respondent's name, else their email)
 * or the id of the question whose answer is the card's headline. Kept in this browser, like the other view choices (the layout, the
 * filters): it is a way of looking, not form data.
 */
export interface BoardCardConfig {
  title: 'auto' | string;
}

export const DEFAULT_BOARD_CARD: BoardCardConfig = { title: 'auto' };

const storageKey = (formId: string) => `beginso:board-card:${formId}`;
const CHANGED = 'beginso:board-card-changed';

/** Reads a stored value defensively: anything that is not the expected shape is the default. */
export function parseBoardCard(raw: string | null | undefined): BoardCardConfig {
  if (!raw) return DEFAULT_BOARD_CARD;
  try {
    const v = JSON.parse(raw) as Partial<BoardCardConfig>;
    return { title: typeof v.title === 'string' && v.title ? v.title : 'auto' };
  } catch {
    return DEFAULT_BOARD_CARD;
  }
}

function read(formId: string): string {
  try {
    return window.localStorage.getItem(storageKey(formId)) ?? '';
  } catch {
    return '';
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener(CHANGED, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(CHANGED, onChange);
  };
}

/** The card setting for one form, and how to change it. Without a form (the all-forms board) there is nothing to choose. */
export function useBoardCardConfig(formId?: string): [BoardCardConfig, (next: BoardCardConfig) => void] {
  const raw = useSyncExternalStore(subscribe, () => (formId ? read(formId) : ''), () => '');
  const config = useMemo(() => parseBoardCard(raw), [raw]);
  const set = useCallback(
    (next: BoardCardConfig) => {
      if (!formId) return;
      try {
        window.localStorage.setItem(storageKey(formId), JSON.stringify(parseBoardCard(JSON.stringify(next))));
      } catch {
        /* storage blocked: the choice just lasts until the next load */
      }
      window.dispatchEvent(new Event(CHANGED));
    },
    [formId]
  );
  return [config, set];
}

// Types whose answer is not a line of text worth putting on a card.
const NOT_FOR_CARDS = new Set(['signature', 'file_upload', 'image_upload']);

/** The questions a card can show: the live ones whose answer reads as text. */
export function cardFields(fields: readonly FormField[] | undefined): FormField[] {
  return (fields ?? []).filter((f) => !f.deleted && !NOT_FOR_CARDS.has(f.type));
}

/** One answer as a single line of text, or undefined when there is nothing worth showing. */
export function answerLine(value: unknown): string | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string') return value.startsWith('data:image/') ? undefined : value.trim() || undefined;
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(answerLine).filter(Boolean).join(', ') || undefined;
  if (typeof value === 'object') return Object.values(value as Record<string, unknown>).map(answerLine).filter(Boolean).join(', ') || undefined;
  return undefined;
}

/** What this response answered to one question (answers are filed under the question's label, with the id as a fallback). */
export function answerFor(answers: ResponseAnswers, fields: readonly FormField[] | undefined, field: FormField): string | undefined {
  const key = buildAnswerKeyMap(fields).get(field) ?? field.label;
  return answerLine(answers[key] ?? answers[field.fieldId]);
}
