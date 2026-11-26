'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';
import type { KpiTone } from '@/components/ui/KpiCard';
import type { ChartSize } from '@/types/charts';

export interface QuestionLayout {
  /** fieldIds in the user's order; questions not listed follow in form order. */
  order: string[];
  sizes: Record<string, ChartSize>;
  colors: Record<string, KpiTone>;
}

const EVENT = 'beginso:question-layout';
const keyOf = (formId: string) => `beginso.questionLayout.${formId}`;

function read(formId: string): string {
  try {
    return window.localStorage.getItem(keyOf(formId)) ?? '';
  } catch {
    return ''; // storage blocked (private window etc.): fall back, never throw
  }
}

function parse(raw: string): QuestionLayout {
  try {
    const value = JSON.parse(raw) as Partial<QuestionLayout>;
    return { order: Array.isArray(value.order) ? value.order : [], sizes: value.sizes ?? {}, colors: value.colors ?? {} };
  } catch {
    return { order: [], sizes: {}, colors: {} };
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

/** The order, sizes and bar colours of a form's question cards. */
// ponytail: remembered in this browser only; a per-form layout endpoint on the backend would make it follow the user.
export function useQuestionLayout(formId: string): [QuestionLayout, (next: QuestionLayout) => void] {
  const raw = useSyncExternalStore(subscribe, () => read(formId), () => '');
  const layout = useMemo(() => parse(raw), [raw]);
  const save = useCallback(
    (next: QuestionLayout) => {
      try {
        window.localStorage.setItem(keyOf(formId), JSON.stringify(next));
      } catch {
        return;
      }
      window.dispatchEvent(new Event(EVENT));
    },
    [formId],
  );
  return [layout, save];
}
