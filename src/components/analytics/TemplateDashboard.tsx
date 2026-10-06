'use client';

import type { ReactNode } from 'react';
import { getDashboardPreset, type DashboardCardId } from '@/lib/dashboardPresets';

interface TemplateDashboardProps {
  /** The form's source-template category; null/absent/unknown = the generic dashboard. */
  templateCategory?: string | null;
  /** The existing built-in cards, keyed by id. A preset composes these - it never adds chart code. */
  cards: Partial<Record<DashboardCardId, ReactNode>>;
}

// Sprint 14 (requirements 1.4, task 3.1): orders the built-in cards by the form's source template.
// A form with no template (every pre-existing form, OQ-4) gets the generic order and no
// "template" wording at all.
export function TemplateDashboard({ templateCategory, cards }: TemplateDashboardProps) {
  const preset = getDashboardPreset(templateCategory);
  return (
    <>
      {preset.label && <p className="bg-overline text-(--text-muted)">{preset.label}</p>}
      {preset.cards.map((id) => {
        const node = cards[id];
        return node ? <div key={id} className="contents">{node}</div> : null;
      })}
    </>
  );
}
