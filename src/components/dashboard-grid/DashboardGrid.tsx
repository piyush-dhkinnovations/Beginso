'use client';

import { useState, type ReactNode } from 'react';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trash2 } from 'lucide-react';
import { Menu, menuChoices, type MenuItem } from '@/components/ui/Menu';
import { KpiCard, type KpiData, type KpiTone } from '@/components/ui/KpiCard';
import { Card } from '@/components/ui/Card';
import { ChartWidget } from './ChartWidget';
import { bx } from '@/lib/utils';
import { MapWidget } from './MapWidget';
import { TONES, TONE_COLOR, WIDTHS, isKpi, isLocations, isSegments, isSeries, type MetricMap, type Widget, type WidgetWidth } from './types';

// Literal class names so Tailwind sees them. Mobile: always full width; tablet: 3/4 -> half.
const SPAN: Record<WidgetWidth, string> = {
  3: 'md:col-span-3 xl:col-span-3',
  4: 'md:col-span-3 xl:col-span-4',
  6: 'md:col-span-6 xl:col-span-6',
  12: 'md:col-span-6 xl:col-span-12',
};
const WIDTH_LABEL: Record<WidgetWidth, string> = { 3: 'Small', 4: 'Medium', 6: 'Large', 12: 'Full width' };
// Rows share one track height so cards line up; a map spans three tracks, a chart over time two, a KPI card or a chart of a few
// categories one (its row grows to fit the chart, rather than leaving the card a tall frame with a small chart in the middle).
const rows = (w: Widget, metrics: MetricMap) =>
  w.config.type === 'map' ? 'row-span-3' : w.config.type === 'chart' && isSeries(metrics[w.config.metric] ?? {}) ? 'row-span-2' : '';
const GRID = 'grid auto-rows-[minmax(8.5rem,auto)] grid-cols-1 gap-4 md:grid-cols-6 xl:grid-cols-12';

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
  if (c.type === 'map') {
    if (!isLocations(m)) return <Unavailable onRemove={onRemove} />;
    return <MapWidget metric={m} title={c.title} />;
  }
  if (c.type === 'kpi') {
    if (!isKpi(m)) return <Unavailable onRemove={onRemove} />;
    const data: KpiData = { ...m, ...(c.title ? { label: c.title } : {}), ...(c.tone ? { tone: c.tone } : {}) };
    return <KpiCard variant={c.variant} data={data} />;
  }
  if (!isSeries(m) && !isSegments(m)) return <Unavailable onRemove={onRemove} />;
  return <ChartWidget chart={c.chart} metric={m} title={c.title} />;
}

function SortableWidget({
  widget, metrics, selected, onSelect, onResize, onRecolor, onRemove,
}: {
  widget: Widget; metrics: MetricMap; selected: boolean; onSelect: () => void;
  onResize: (w: WidgetWidth) => void; onRecolor: (t: KpiTone) => void; onRemove: () => void;
}) {
  // The whole card is the drag handle (a click still just selects it: the pointer must move 6px to start a drag).
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: widget.id });
  const items: MenuItem[] = [
    ...menuChoices('Size', WIDTHS.map((w) => ({ value: w, label: WIDTH_LABEL[w] })), widget.w, onResize),
    ...(widget.config.type === 'kpi'
      ? menuChoices('Colour', TONES.map((t) => ({ ...t, swatch: TONE_COLOR[t.value] })), widget.config.tone ?? 'primary', onRecolor)
      : []),
    { id: 'remove', label: 'Remove widget', icon: <Trash2 size={16} />, danger: true, onSelect: onRemove },
  ];
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition, zIndex: isDragging ? 20 : selected ? 2 : undefined }}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      {...attributes}
      {...listeners}
      aria-label={`${widget.config.type === 'kpi' ? 'Card' : widget.config.type === 'map' ? 'Map' : 'Chart'}: drag to reorder, press Space to pick up`}
      className={bx(
        SPAN[widget.w], rows(widget, metrics),
        'group/widget relative min-w-0 cursor-grab touch-none select-none rounded-(--bg-radius-lg) outline-none transition-shadow active:cursor-grabbing',
        selected ? 'ring-2 ring-(--action-primary) ring-offset-2 ring-offset-(--bg-page,var(--surface-card))' : 'ring-1 ring-transparent hover:ring-(--border-strong)',
        isDragging && 'opacity-90 shadow-xl',
      )}
    >
      {/* Controls live in one three-dot menu on the card. Pointer events stop here so opening it never starts a drag. */}
      <div
        className={bx('absolute -right-2 -top-2 z-10 transition-opacity', selected ? 'opacity-100' : 'opacity-0 group-hover/widget:opacity-100 focus-within:opacity-100 max-md:opacity-100')}
        onPointerDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* The standard three-dot button, on a solid background because it sits over the card's corner. */}
        <Menu align="end" triggerLabel="Edit widget" triggerClassName="bg-btn bg-btn-secondary bg-btn-icon" items={items} />
      </div>
      <div className="pointer-events-none h-full min-h-0 *:h-full">
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  if (widgets.length === 0) return <>{empty ?? null}</>;

  if (!onChange) {
    return (
      <div className={GRID}>
        {widgets.map((w) => <div key={w.id} className={bx(SPAN[w.w], rows(w, metrics), 'min-w-0 *:h-full')}><WidgetBody widget={w} metrics={metrics} /></div>)}
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
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={({ active }) => setSelectedId(String(active.id))} onDragEnd={onDragEnd}>
      <SortableContext items={widgets.map((w) => w.id)} strategy={rectSortingStrategy}>
        <div className={GRID} onClick={() => setSelectedId(null)}>
          {widgets.map((w) => (
            <SortableWidget
              key={w.id}
              widget={w}
              metrics={metrics}
              selected={selectedId === w.id}
              onSelect={() => setSelectedId(w.id)}
              onResize={(width) => onChange(widgets.map((x) => (x.id === w.id ? { ...x, w: width } : x)))}
              onRecolor={(tone) => onChange(widgets.map((x) => (x.id === w.id && x.config.type === 'kpi' ? { ...x, config: { ...x.config, tone } } : x)))}
              onRemove={() => onChange(widgets.filter((x) => x.id !== w.id))}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
