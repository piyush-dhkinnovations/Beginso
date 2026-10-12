'use client';

import { useState, type ReactNode } from 'react';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check, MoreVertical, Trash2 } from 'lucide-react';
import { Menu, type MenuItem } from '@/components/ui/Menu';
import { KpiCard, type KpiData, type KpiTone } from '@/components/ui/KpiCard';
import { Card } from '@/components/ui/Card';
import { ChartWidget } from './ChartWidget';
import { bx } from '@/lib/utils';
import { MapWidget } from './MapWidget';
import { TONES, WIDTHS, isKpi, isLocations, isSegments, isSeries, type MetricMap, type Widget, type WidgetWidth } from './types';

// Literal class names so Tailwind sees them. Mobile: always full width; tablet: 3/4 -> half.
const SPAN: Record<WidgetWidth, string> = {
  3: 'md:col-span-3 xl:col-span-3',
  4: 'md:col-span-3 xl:col-span-4',
  6: 'md:col-span-6 xl:col-span-6',
  12: 'md:col-span-6 xl:col-span-12',
};
const TONE_DOT: Record<KpiTone, string> = { primary: 'var(--action-primary)', success: 'var(--success)', warning: 'var(--warning)', error: 'var(--error)', purple: '#8B5CF6' };
const WIDTH_LABEL: Record<WidgetWidth, string> = { 3: 'Small (1/4)', 4: 'Medium (1/3)', 6: 'Wide (1/2)', 12: 'Full width' };
// Rows share one track height so cards line up; a chart spans two tracks, a KPI card one.
const rows = (w: Widget) => (w.config.type === 'map' ? 'row-span-3' : w.config.type === 'chart' ? 'row-span-2' : '');
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
    ...WIDTHS.map((w) => ({
      id: `w${w}`,
      label: `Width: ${WIDTH_LABEL[w]}`,
      icon: widget.w === w ? <Check size={16} /> : <span className="inline-block size-4" />,
      onSelect: () => onResize(w),
    })),
    ...(widget.config.type === 'kpi'
      ? TONES.map((t) => ({
          id: `t${t.value}`,
          label: `Colour: ${t.label}`,
          icon: <span className="inline-flex size-4 items-center justify-center"><span className="size-3 rounded-full" style={{ backgroundColor: TONE_DOT[t.value] }} />{(widget.config as { tone?: KpiTone }).tone === t.value || (!(widget.config as { tone?: KpiTone }).tone && t.value === 'primary') ? <Check size={10} className="absolute text-white" /> : null}</span>,
          onSelect: () => onRecolor(t.value),
        }))
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
        SPAN[widget.w], rows(widget),
        'group/widget relative min-w-0 cursor-grab touch-none select-none rounded-2xl outline-none transition-shadow active:cursor-grabbing',
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
        <Menu
          align="end"
          trigger={<MoreVertical className="size-4" />}
          triggerLabel="Edit widget"
          triggerClassName="flex size-8 items-center justify-center rounded-full border border-(--border-default) bg-(--surface-card) text-(--text-secondary) shadow-(--shadow-sm) hover:bg-(--surface-hover) hover:text-(--text-primary)"
          items={items}
        />
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
