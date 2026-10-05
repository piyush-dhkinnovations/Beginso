'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { LayoutPresetInfo } from '@/lib/layoutPresets';
import type { LayoutPreset } from '@/types/form';

// Static schematic per preset, drawn from tokens (the same approach SettingsPanel's old
// LayoutPreview used) — cards never mount the real form; only an explicit Preview does.
function Schematic({ id }: { id: LayoutPreset }) {
  const bar = 'rounded-sm bg-(--border-strong)';
  const accent = 'rounded-sm bg-(--action-primary)';
  switch (id) {
    case 'card_stack':
      return (
        <div className="flex flex-col gap-1 w-full">
          <div className={`h-2 ${bar}`} />
          <div className="rounded-sm border border-(--border-strong) p-1 flex flex-col gap-1">
            <div className={`h-1.5 ${bar}`} />
            <div className={`h-1.5 ${bar}`} />
          </div>
        </div>
      );
    case 'guided':
      return (
        <div className="flex flex-col items-center gap-1.5 w-full">
          <div className={`h-1 w-full ${accent} opacity-60`} />
          <div className={`h-2.5 w-3/4 ${bar}`} />
          <div className={`h-3 w-1/3 ${accent}`} />
        </div>
      );
    case 'steps':
      return (
        <div className="flex flex-col gap-1.5 w-full">
          <div className="flex items-center gap-1">
            <div className={`size-2 rounded-full ${accent}`} />
            <div className={`h-0.5 flex-1 ${bar}`} />
            <div className="size-2 rounded-full bg-(--border-strong)" />
            <div className={`h-0.5 flex-1 ${bar}`} />
            <div className="size-2 rounded-full bg-(--border-strong)" />
          </div>
          <div className={`h-2 ${bar}`} />
          <div className={`h-2 ${bar}`} />
        </div>
      );
    case 'split_feature':
      return (
        <div className="flex gap-1.5 w-full h-full">
          <div className={`w-2/5 ${accent}`} />
          <div className="flex-1 flex flex-col gap-1 justify-center">
            <div className={`h-1.5 ${bar}`} />
            <div className={`h-1.5 ${bar}`} />
            <div className={`h-1.5 ${bar}`} />
          </div>
        </div>
      );
    case 'compact':
      return (
        <div className="flex flex-col gap-1 w-full">
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex gap-1">
              <div className={`h-1.5 flex-1 ${bar}`} />
              <div className={`h-1.5 flex-1 ${bar}`} />
            </div>
          ))}
        </div>
      );
    default:
      return (
        <div className="flex flex-col gap-1.5 w-full">
          {[0, 1, 2].map((row) => (
            <div key={row} className={`h-2 w-full ${bar}`} />
          ))}
        </div>
      );
  }
}

export interface LayoutPresetCardProps {
  preset: LayoutPresetInfo;
  selected: boolean;
  canPreview: boolean;
  onPreview: () => void;
  onUse: () => void;
}

// Wireframe card: thumbnail, name + badge ("In use" or the best-for range), tagline, use-case line,
// Preview + Use. The per-card Mobile / Accessibility / Watch-out block lives in the Preview dialog
// only (wireframe V2.4a: in a 3-up grid it turned each card into a wall of small text).
export function LayoutPresetCard({ preset, selected, canPreview, onPreview, onUse }: LayoutPresetCardProps) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="h-16 flex items-center justify-center bg-(--bg-sunken) rounded-md px-3">
        <Schematic id={preset.id} />
      </div>
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="bg-body font-semibold text-(--text-primary)">{preset.name}</h3>
          {selected ? <Badge variant="success">In use</Badge> : <Badge variant="neutral">{preset.best}</Badge>}
        </div>
        <p className="bg-body-sm font-medium text-(--text-secondary) mt-1">{preset.tagline}</p>
        <p className="bg-caption text-(--text-muted) mt-1">{preset.use}</p>
      </div>
      <div className="flex gap-2 mt-auto">
        <Button type="button" variant="secondary" size="small" className="flex-1" onClick={onPreview} disabled={!canPreview}>
          Preview
        </Button>
        <Button type="button" size="small" className="flex-1" onClick={onUse} disabled={selected}>
          {selected ? 'In use' : 'Use'}
        </Button>
      </div>
    </Card>
  );
}
