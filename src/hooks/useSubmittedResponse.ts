'use client';

import { useMemo, useState } from 'react';
import { useNarrow } from '@/hooks/useNarrow';
import { useResponseView } from '@/hooks/useResponseView';
import { arrangeAnswers, effectiveLayout } from '@/lib/responseView';
import type { AnswerItem } from '@/lib/responseAnswers';

interface Options {
  responseId: string | null;
  formId: string | undefined;
  scope: string;
  items: AnswerItem[];
  /** False while the form definition is unavailable: then no answer can be called "from a removed question". */
  hasSchema: boolean;
}

// What the person has typed or revealed belongs to one response; moving to the next one starts fresh.
interface Ui {
  responseId: string | null;
  query: string;
  revealEmpty: boolean;
}

/**
 * Everything the toolbar (search, layout switcher, options) and the answers card share: the saved layout choice, the search text,
 * and the arranged answers. Both are rendered in different places (the toolbar sits under the page header, the card below it), so
 * the state lives here rather than in either of them.
 */
export function useSubmittedResponse({ responseId, formId, scope, items, hasSchema }: Options) {
  const narrow = useNarrow();
  const rv = useResponseView({ formId, scope });
  const { view } = rv;
  const layout = effectiveLayout(view.layout, narrow);

  const [stored, setStored] = useState<Ui>({ responseId, query: '', revealEmpty: false });
  const ui: Ui = stored.responseId === responseId ? stored : { responseId, query: '', revealEmpty: false };
  const setQuery = (query: string) => setStored({ ...ui, query });
  const setRevealEmpty = (revealEmpty: boolean) => setStored({ ...ui, revealEmpty });

  const arranged = useMemo(
    () => arrangeAnswers(items, { showEmpty: view.showEmpty || ui.revealEmpty, query: ui.query, hasSchema }),
    [items, view.showEmpty, ui.revealEmpty, ui.query, hasSchema]
  );

  return { rv, view, layout, narrow, query: ui.query, setQuery, revealEmpty: ui.revealEmpty, setRevealEmpty, arranged, itemCount: items.length };
}

export type SubmittedResponseState = ReturnType<typeof useSubmittedResponse>;
