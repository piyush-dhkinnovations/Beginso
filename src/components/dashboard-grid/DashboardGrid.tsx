'use client';

import { type ReactNode } from 'react';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import { KpiCard, type KpiData } from '@/components/ui/KpiCard';
import { Card } from '@/components/ui/Card';
import { ChartWidget } from './ChartWidget';
import { bx } from '@/lib/utils';
import { WIDTHS, isKpi, isSegments, isSeries, type MetricMap, type Widget, type WidgetWidth } from './types';

// Literal class names so Tailwind sees them. Mobile: always full width; tablet: 3/4 -> half.
const SPAN: Record<WidgetWidth, string> = {
  3: 'md:col-span-3 xl:col-span-3',
  4: 'md:col-span-3 xl:col-span-4',
  6: 'md:col-span-6 xl:col-span-6',
};
const WIDTH_LABEL: Record<WidgetWidth, string> = { 3: 'Small (1/4)', 4: 'Medium (1/3)', 6: 'Wide (1/2)' };
// Rows share one track height so cards line up; a chart spans two tracks, a KPI card one.
const rows = (w: Widget) => (w.config.type === 'chart' ? 'row-span-2' : '');
const GRID = 'grid auto-rows-[minmax(11rem,auto)] grid-cols-1 gap-4 md:grid-cols-6 xl:grid-cols-12';

function Unavailable({ onRemove }: { onRemove?: () => void }) {
  return (
    <Card className="flex h-full flex-col items-start justify-center gap-2">
      <span className="bg-body-sm text-(--text-muted)">This widget&apos;s data isn&apos;t available.</span>
      {onRemove && <button type="button" onClick={onRemove} className="bg-body-sm font-semibold text-(--text-link)">Remove widget</button>}
    </Card>
  );
}

function WidgetBody({ widget, metrics, onRemove }: { widget: Widget; metrics: MetricMap; onRemove?: () => void }) {
  const c = widget.config;
  const m = metrics[c.metric];
  if (!m) return <Unavailable onRemove={onRemove} />;
  if (c.type === 'kpi') {
    if (!isKpi(m)) return <Unavailable onRemove={onRemove} />;
    const data: KpiData = c.title ? { ...m, label: c.title } : m;
    return <KpiCard variant={c.variant} data={data} />;
  }
  if (!isSeries(m) && !isSegments(m)) return <Unavailable onRemove={onRemove} />;
  return <ChartWidget chart={c.chart} metric={m} title={c.title} />;
}

function SortableWidget({ widget, metrics, onResize, onRemove }: { widget: Widget; metrics: MetricMap; onResize: (w: WidgetWidth) => void; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: widget.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition, opacity: isDragging ? 0.6 : 1, zIndex: isDragging ? 5 : undefined }}
      className={bx(SPAN[widget.w], rows(widget), 'flex min-w-0 flex-col gap-2')}
    >
      <div className="flex items-center justify-between gap-2 rounded-xl border border-(--border-default) bg-(--surface-card) px-1.5 py-1">
        <button ref={setActivatorNodeRef} type="button" aria-label="Drag to reorder" className="flex cursor-grab touch-none items-center gap-1 rounded p-1 text-xs text-(--text-muted) hover:bg-(--surface-hover)" {...attributes} {...listeners}>
          <GripVertical className="size-4" />Move
        </button>
        <select
          aria-label="Widget width"
          value={widget.w}
          onChange={(e) => onResize(Number(e.target.value) as WidgetWidth)}
          className="rounded border border-(--border-default) bg-(--surface-card) px-1 py-0.5 text-xs text-(--text-primary)"
        >
          {WIDTHS.map((w) => <option key={w} value={w}>{WIDTH_LABEL[w]}</option>)}
        </select>
        <button type="button" aria-label="Remove widget" onClick={onRemove} className="rounded p-1 text-(--text-muted) hover:bg-(--surface-hover) hover:text-(--error)">
          <Trash2 className="size-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 *:h-full">
        <WidgetBody widget={widget} metrics={metrics} onRemove={onRemove} />
      </div>
    </div>
  );
}

export interface DashboardGridProps {
  widgets: Widget[];
  metrics: MetricMap;
  /** Edit mode: pass onChange. View mode (read-only, no drag active): omit it. */
  onChange?: (next: Widget[]) => void;
  empty?: ReactNode;
}

export function DashboardGrid({ widgets, metrics, onChange, empty }: DashboardGridProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  if (widgets.length === 0) return <>{empty ?? null}</>;

  if (!onChange) {
    return (
      <div className={GRID}>
        {widgets.map((w) => <div key={w.id} className={bx(SPAN[w.w], rows(w), 'min-w-0 *:h-full')}><WidgetBody widget={w} metrics={metrics} /></div>)}
      </div>
    );
  }

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = widgets.findIndex((w) => w.id === active.id);
    const to = widgets.findIndex((w) => w.id === over.id);
    if (from >= 0 && to >= 0) onChange(arrayMove(widgets, from, to));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={widgets.map((w) => w.id)} strategy={rectSortingStrategy}>
        <div className={GRID}>
          {widgets.map((w) => (
            <SortableWidget
              key={w.id}
              widget={w}
              metrics={metrics}
              onResize={(width) => onChange(widgets.map((x) => (x.id === w.id ? { ...x, w: width } : x)))}
              onRemove={() => onChange(widgets.filter((x) => x.id !== w.id))}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
