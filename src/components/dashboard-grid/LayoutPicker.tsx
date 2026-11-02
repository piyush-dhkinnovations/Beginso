'use client';

import { Modal } from '@/components/ui/Modal';
import { bx } from '@/lib/utils';
import { LAYOUT_PRESETS, buildLayout } from './layoutPresets';
import type { MetricMap, Widget } from './types';

const SPAN: Record<Widget['w'], string> = { 3: 'w-[calc(25%-3px)]', 4: 'w-[calc(33.333%-3px)]', 6: 'w-[calc(50%-2px)]', 12: 'w-full' };
const HEIGHT = { kpi: 'h-4', chart: 'h-8', map: 'h-10' } as const;

/** A small sketch of a layout: one block per widget, as wide and as tall (roughly) as the real one. */
function Sketch({ widgets }: { widgets: Widget[] }) {
  return (
    <span aria-hidden="true" className="flex flex-wrap content-start gap-1 rounded-lg bg-(--bg-subtle) p-2">
      {widgets.map((w) => (
        <span key={w.id} className={bx('rounded-md', SPAN[w.w], HEIGHT[w.config.type], w.config.type === 'kpi' ? 'bg-(--accent-soft)' : 'bg-(--border-default)')} />
      ))}
    </span>
  );
}

interface LayoutPickerProps {
  isOpen: boolean;
  onClose: () => void;
  metrics: MetricMap;
  /** The chosen layout's widgets. The caller shows them as a draft: Save keeps them, Cancel brings the old dashboard back. */
  onPick: (widgets: Widget[]) => void;
}

export function LayoutPicker({ isOpen, onClose, metrics, onPick }: LayoutPickerProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Choose a layout"
      description="Pick a starting point. It shows here first: Save keeps it, Cancel brings your dashboard back. You can still move, resize or add widgets after."
      size="lg"
    >
      <ul className="grid gap-3 sm:grid-cols-2">
        {LAYOUT_PRESETS.map((preset) => {
          const widgets = buildLayout(preset, metrics);
          const empty = widgets.length === 0;
          return (
            <li key={preset.id}>
              <button
                type="button"
                disabled={empty}
                onClick={() => onPick(widgets)}
                aria-label={`Use the ${preset.name} layout`}
                className="flex h-full w-full flex-col gap-3 rounded-xl border border-(--border-default) p-3 text-left transition-colors hover:border-(--action-primary) hover:bg-(--surface-hover) focus-visible:outline-2 focus-visible:outline-(--action-primary) disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Sketch widgets={widgets} />
                <span>
                  <span className="block bg-body font-semibold text-(--text-primary)">{preset.name}</span>
                  <span className="block bg-body-sm text-(--text-muted)">{empty ? 'Nothing to show yet: this needs some data first.' : preset.description}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
