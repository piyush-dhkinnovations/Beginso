'use client';

import { Check, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { LayoutPresetInfo } from '@/lib/layoutPresets';
import type { LayoutPreset } from '@/types/form';

// Static schematic per preset, drawn from tokens — cards never mount the real form; only an explicit
// Preview does. Each is a small white "form" sheet on a tinted stage, like the reference gallery.
const FIELD = 'h-3 rounded-sm bg-(--bg-sunken) border border-(--border-subtle)';
const LABEL = 'h-1 w-1/3 rounded-full bg-(--border-strong)';
const BTN = 'h-3.5 rounded-sm bg-(--action-primary)';

function Sheet({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-md bg-(--surface-card) shadow-(--shadow-md) p-3 flex flex-col gap-2 ${className}`}>{children}</div>;
}

function Schematic({ id }: { id: LayoutPreset }) {
  switch (id) {
    case 'card_stack':
      return (
        <Sheet className="w-3/5">
          <div className="h-1.5 w-1/2 rounded-full bg-(--border-strong)" />
          <div className="rounded-sm border border-(--border-subtle) p-1.5 flex flex-col gap-1.5">
            <div className={FIELD} />
            <div className={FIELD} />
          </div>
          <div className="rounded-sm border border-(--border-subtle) p-1.5 flex flex-col gap-1.5">
            <div className={FIELD} />
          </div>
          <div className={`${BTN} w-1/4 self-end`} />
        </Sheet>
      );
    case 'guided':
      return (
        <Sheet className="w-3/5">
          <div className="h-1 w-full rounded-full bg-(--bg-sunken)"><div className="h-1 w-1/4 rounded-full bg-(--action-primary)" /></div>
          <div className="h-2 w-3/4 rounded-sm bg-(--border-strong)" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className="size-2 rounded-full border border-(--border-strong)" />
              <div className="h-1 w-1/3 rounded-full bg-(--border-default)" />
            </div>
          ))}
          <div className={`${BTN} w-1/4 self-end`} />
        </Sheet>
      );
    case 'steps':
      return (
        <div className="flex w-4/5 overflow-hidden rounded-md shadow-(--shadow-md) bg-(--surface-card)">
          <div className="w-2/5 bg-(--bg-subtle) p-3 flex flex-col gap-2.5">
            {[true, false, false].map((on, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className={`size-2.5 shrink-0 rounded-full border-2 ${on ? 'border-(--action-primary) bg-(--action-primary)' : 'border-(--border-strong)'}`} />
                <div className="h-1 flex-1 rounded-full bg-(--border-default)" />
              </div>
            ))}
          </div>
          <div className="flex-1 p-3 flex flex-col gap-2">
            <div className="h-1.5 w-1/2 rounded-full bg-(--border-strong)" />
            <div className={FIELD} />
            <div className={FIELD} />
            <div className={`${BTN} w-1/3 self-end`} />
          </div>
        </div>
      );
    case 'split_feature':
      return (
        <div className="flex w-4/5 h-[88%] overflow-hidden rounded-md shadow-(--shadow-md) bg-(--surface-card)">
          <div className="w-2/5 bg-(--action-primary)/80 p-3 flex flex-col justify-end gap-1.5">
            <div className="h-1.5 w-2/3 rounded-full bg-white/80" />
            <div className="h-1 w-1/2 rounded-full bg-white/50" />
          </div>
          <div className="flex-1 p-3 flex flex-col justify-center gap-2">
            <div className="h-1.5 w-1/2 rounded-full bg-(--border-strong)" />
            <div className={FIELD} />
            <div className={FIELD} />
            <div className={BTN} />
          </div>
        </div>
      );
    case 'compact':
      return (
        <Sheet className="w-4/5">
          <div className="h-1.5 w-1/3 rounded-full bg-(--border-strong)" />
          {[0, 1, 2].map((row) => (
            <div key={row} className="grid grid-cols-2 gap-1.5">
              <div className={FIELD} />
              <div className={FIELD} />
            </div>
          ))}
          <div className={`${BTN} w-1/4 self-end`} />
        </Sheet>
      );
    default:
      return (
        <Sheet className="w-3/5">
          <div className="h-1.5 w-1/2 rounded-full bg-(--border-strong)" />
          <div className={LABEL} />
          <div className={FIELD} />
          <div className={LABEL} />
          <div className={FIELD} />
          <div className={BTN} />
        </Sheet>
      );
  }
}

export interface LayoutPresetCardProps {
  preset: LayoutPresetInfo;
  selected: boolean;
  /** Shown as a "Recommended" badge when the field count favours this preset. */
  recommended?: boolean;
  canPreview: boolean;
  onPreview: () => void;
  onUse: () => void;
}

// Reference-gallery card: tinted stage with a mini form, name + badge, short use-case, Preview + Use.
// The per-card Mobile / Accessibility / Watch-out block lives in the Preview dialog only.
export function LayoutPresetCard({ preset, selected, recommended, canPreview, onPreview, onUse }: LayoutPresetCardProps) {
  return (
    <article
      className={`relative flex flex-col gap-4 rounded-xl border bg-(--surface-card) p-5 shadow-(--shadow-sm) transition-colors ${
        selected ? 'border-(--action-primary) ring-1 ring-(--action-primary)' : 'border-(--border-default) hover:border-(--border-strong)'
      }`}
    >
      <div className="relative flex h-40 items-center justify-center overflow-hidden rounded-lg bg-(--action-primary)/10">
        <Schematic id={preset.id} />
        {selected && (
          <span className="absolute right-3 top-3 flex size-6 items-center justify-center rounded-full bg-(--action-primary) text-white" aria-hidden="true">
            <Check size={14} />
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="bg-h5 font-bold text-(--text-primary)">{preset.name}</h3>
          {recommended && !selected ? <Badge variant="success">Recommended</Badge> : <Badge variant="neutral">{preset.best}</Badge>}
        </div>
        <p className="bg-body-sm text-(--text-muted) line-clamp-2">{preset.use}</p>
      </div>
      <div className="mt-auto flex gap-3">
        <Button type="button" variant="secondary" className="min-h-11 flex-1 gap-2" onClick={onPreview} disabled={!canPreview}>
          <Eye size={16} aria-hidden="true" />
          Preview
        </Button>
        <Button type="button" className="min-h-11 flex-1" onClick={onUse} disabled={selected}>
          {selected ? 'In use' : 'Use this layout'}
        </Button>
      </div>
    </article>
  );
}
