'use client';

import { Modal } from '@/components/ui/Modal';
import { bx } from '@/lib/utils';
import { LAYOUT_PRESETS, buildLayout } from './layoutPresets';
import type { MetricMap, Widget } from './types';

const SPAN: Record<Widget['w'], string> = { 3: 'w-[calc(25%-6px)]', 4: 'w-[calc(33.333%-5.4px)]', 6: 'w-[calc(50%-4px)]', 12: 'w-full' };
const HEIGHT = { kpi: 'h-8', chart: 'h-12', map: 'h-12' } as const;
const BAR_HEIGHTS = ['h-[35%]', 'h-[60%]', 'h-[45%]', 'h-[80%]', 'h-[55%]', 'h-[70%]'];

/** What a block draws inside itself, so a sketch reads as a dashboard rather than as grey boxes. */
function Glyph({ widget }: { widget: Widget }) {
  const c = widget.config;
  if (c.type === 'kpi') {
    return (
      <span className="flex h-full flex-col justify-center gap-1.5 px-2">
        <span className="h-1 w-1/2 rounded-full bg-(--text-muted)/40" />
        <span className="h-2 w-3/4 rounded-full bg-(--action-primary)/70" />
      </span>
    );
  }
  if (c.type === 'map') {
    return (
      <span className="relative block h-full overflow-hidden rounded-md bg-[radial-gradient(var(--border-strong)_1px,transparent_1px)] [background-size:8px_8px]">
        {[['22%', '40%'], ['48%', '30%'], ['60%', '60%'], ['78%', '35%']].map(([left, top]) => (
          <span key={left} className="absolute size-1.5 rounded-full bg-(--action-primary)" style={{ left, top }} />
        ))}
      </span>
    );
  }
  if (c.chart === 'donut' || c.chart === 'pie' || c.chart === 'status') {
    return (
      <span className="flex h-full items-center justify-center">
        <span className={bx('size-9 rounded-full border-[5px] border-(--action-primary)/60 border-r-(--border-strong)', c.chart === 'pie' && 'border-[18px]')} />
      </span>
    );
  }
  if (c.chart === 'hbar') {
    return (
      <span className="flex h-full flex-col justify-center gap-1.5 px-3">
        {['w-4/5', 'w-3/5', 'w-2/5'].map((w) => (
          <span key={w} className={bx('h-1.5 rounded-full bg-(--action-primary)/60', w)} />
        ))}
      </span>
    );
  }
  return (
    <span className="flex h-full items-end gap-1 px-3 pb-2 pt-2">
      {BAR_HEIGHTS.concat(widget.w === 12 ? BAR_HEIGHTS : []).map((h, i) => (
        <span key={i} className={bx('flex-1 rounded-t-sm bg-(--action-primary)/60', h)} />
      ))}
    </span>
  );
}

/** A small picture of a layout: one block per widget, as wide as the real one, drawn with what it shows. The frame is the same height for every layout. */
function Sketch({ widgets }: { widgets: Widget[] }) {
  return (
    <span aria-hidden="true" className="flex h-44 flex-wrap content-center gap-2 overflow-hidden rounded-lg bg-(--bg-subtle) p-3">
      {widgets.map((w) => (
        <span key={w.id} className={bx('overflow-hidden rounded-md border border-(--border-default) bg-(--surface-card)', SPAN[w.w], HEIGHT[w.config.type])}>
          <Glyph widget={w} />
        </span>
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
      description="Pick a starting point. It shows on your dashboard first: Save keeps it, Cancel brings your dashboard back. You can still move, resize or add widgets after."
      size="lg"
    >
      <ul className="grid gap-4 sm:grid-cols-2">
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
                className="group flex h-full w-full flex-col gap-3 rounded-xl border border-(--border-default) p-3 text-left transition-colors hover:border-(--action-primary) hover:bg-(--surface-hover) focus-visible:outline-2 focus-visible:outline-(--action-primary) disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Sketch widgets={widgets} />
                <span className="flex min-h-14 flex-col gap-0.5">
                  <span className="flex items-center justify-between gap-2">
                    <span className="bg-body font-semibold text-(--text-primary)">{preset.name}</span>
                    <span className="bg-caption font-semibold text-(--action-primary) opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">Use this layout</span>
                  </span>
                  <span className="bg-body-sm text-(--text-muted)">{empty ? 'Nothing to show yet: this needs some data first.' : preset.description}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
