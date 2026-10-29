'use client';

import type { CSSProperties } from 'react';
import { Check } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { LAYOUT_LOOKS, LAYOUT_PRESETS, layoutRecommendation } from '@/lib/layoutPresets';
import { brandWashStyle } from '@/lib/formTheme';
import { bx } from '@/lib/utils';
import type { LayoutPreset } from '@/types/form';
import { Schematic } from './LayoutSchematic';

/** The layout the field count favours: Classic for a short form, Steps for a longer one. */
export const recommendedLayout = (fieldCount: number): LayoutPreset | null => (fieldCount === 0 ? null : fieldCount <= 5 ? 'classic' : 'steps');

export interface LayoutChooserProps {
  current: LayoutPreset;
  fieldCount: number;
  /** True when the form is live under a public access mode: Compact is not for public forms. */
  isPublic: boolean;
  /** One click: the layout and its look are applied at once (the live preview beside it shows the result). */
  onPick: (layout: LayoutPreset) => void;
}

/**
 * The six layouts as tiles, each a thumbnail and a name. Picking one applies it at once. There is no separate "Preview" and "Use this
 * layout" step: the live preview next to the controls already shows the result, and a wrong pick is one click from being undone.
 */
export function LayoutChooser({ current, fieldCount, isPublic, onPick }: LayoutChooserProps) {
  const nudge = layoutRecommendation(fieldCount);
  const recommended = recommendedLayout(fieldCount);
  const compact = LAYOUT_PRESETS.find((p) => p.id === 'compact');
  return (
    <div className="flex flex-col gap-3">
      {nudge && (
        <p className="bg-body-sm text-(--text-muted)">
          <strong className="font-semibold text-(--text-primary)">
            {fieldCount} {fieldCount === 1 ? 'field' : 'fields'}.
          </strong>{' '}
          {nudge}
        </p>
      )}
      <div role="group" aria-label="Layout" className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-2">
        {LAYOUT_PRESETS.map((preset) => {
          const look = LAYOUT_LOOKS[preset.id];
          const selected = preset.id === current;
          return (
            <button
              key={preset.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onPick(preset.id)}
              title={preset.tagline}
              className={bx(
                'flex flex-col gap-2 rounded-xl border-2 p-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-(--border-focus)',
                selected ? 'border-(--action-primary) bg-(--accent-soft)' : 'border-(--border-default) bg-(--surface-card) hover:border-(--border-strong)',
              )}
            >
              <span
                className="relative flex h-24 items-center justify-center overflow-hidden rounded-lg border border-(--border-subtle)"
                style={{ '--action-primary': look.color, ...brandWashStyle({ primaryColor: look.color, backgroundStyle: look.background }) } as CSSProperties}
              >
                <Schematic id={preset.id} look={look} />
                {selected && (
                  <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-(--text-primary) text-(--surface-card)" aria-hidden="true">
                    <Check size={12} />
                  </span>
                )}
              </span>
              <span className="flex min-w-0 flex-col gap-0.5 px-0.5 pb-0.5">
                <span className="flex items-center justify-between gap-1.5">
                  <span className="truncate bg-body-sm font-semibold text-(--text-primary)">{preset.name}</span>
                  {recommended === preset.id && <Badge variant="success">Suggested</Badge>}
                </span>
                <span className="truncate bg-caption text-(--text-muted)">{preset.best}</span>
              </span>
            </button>
          );
        })}
      </div>
      {isPublic && current === 'compact' && compact && (
        <Alert variant="warning" title="Compact is for internal forms">
          {compact.watch}
        </Alert>
      )}
    </div>
  );
}
