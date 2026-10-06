'use client';

import { useContext, useMemo, useState, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, GripVertical, LockKeyhole, Plus } from 'lucide-react';
import { isAxiosError } from 'axios';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { ChartDrawer } from './ChartDrawer';
import { ChartDrillPanel, type DrillState } from './ChartDrillPanel';
import { ChartFullScreen } from './ChartFullScreen';
import { CustomChartCard } from './CustomChartCard';
import type { DrillTarget } from './ChartView';
import { ResponseDrawer } from '@/components/responses/ResponseDrawer';
import { useStages } from '@/hooks/useStages';
import { useWorkspaceRole } from '@/hooks/useWorkspaceRole';
import { AuthContext } from '@/lib/authContext';
import { chartsService } from '@/services/charts';
import { chartKeys, type AnalyticsRangeParams } from '@/lib/queryKeys';
import { chartableFields, dateGranularity } from '@/lib/chartOptions';
import { canEditCharts } from '@/lib/roles';
import type { ChartDefinition, ChartSize, SavedChart } from '@/types/charts';
import type { Form } from '@/types/form';

interface CustomChartsSectionProps {
  form?: Form;
  formId: string;
  scope: string;
  range: AnalyticsRangeParams;
  /** The page-level "Add chart" button lives next to the date range; it just flips this. */
  addOpen: boolean;
  onAddClose: () => void;
  onAddRequest: () => void;
}

// Desktop (>= 1280): small 1/3, medium 1/2, large full. Tablet: large stays full, small and medium become a
// half. Mobile: everything is full width. Literal class names so Tailwind sees them.
const SPAN: Record<ChartSize, string> = {
  small: 'md:col-span-3 xl:col-span-2',
  medium: 'md:col-span-3 xl:col-span-3',
  large: 'md:col-span-6 xl:col-span-6',
};

const GRID = 'grid grid-cols-1 gap-4 md:grid-cols-6';

function SortableChart({ chart, children }: { chart: SavedChart; children: (handle: ReactNode) => ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: chart._id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1, zIndex: isDragging ? 5 : undefined }}
      className={`${SPAN[chart.size]} min-w-0`}
    >
      {children(
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Reorder chart ${chart.title}`}
          className="bg-btn bg-btn-ghost bg-btn-icon shrink-0 cursor-grab touch-none"
        >
          <GripVertical size={16} className="bg-icon" />
        </button>,
      )}
    </div>
  );
}

function ResponseOverlay({ responseId, formId, scope, formTitle, onOpen, onClose }: { responseId: string; formId: string; scope: string; formTitle?: string; onOpen: (id: string) => void; onClose: () => void }) {
  const { data: stages } = useStages(scope);
  return <ResponseDrawer responseId={responseId} formId={formId} scope={scope} stages={stages ?? []} formTitle={formTitle} onOpenResponse={onOpen} onClose={onClose} />;
}

export function CustomChartsSection({ form, formId, scope, range, addOpen, onAddClose, onAddRequest }: CustomChartsSectionProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const role = useWorkspaceRole(scope);
  const canEdit = canEditCharts(role);
  const me = useContext(AuthContext)?.user?.id;
  const [editing, setEditing] = useState<SavedChart | null>(null);
  const [drill, setDrill] = useState<DrillState | null>(null);
  const [fullScreenId, setFullScreenId] = useState<string | null>(null);
  const responseId = searchParams.get('responseId');

  const listKey = chartKeys.list(scope, formId);
  const chartsQuery = useQuery({ queryKey: listKey, queryFn: () => chartsService.list(formId, scope) });
  const status = isAxiosError(chartsQuery.error) ? chartsQuery.error.response?.status : undefined;

  const fields = useMemo(() => form?.fields ?? [], [form]);
  const fieldById = useMemo(() => new Map(fields.map((f) => [f.fieldId, f])), [fields]);
  const chartable = useMemo(() => chartableFields(fields), [fields]);

  const ordered = useMemo(() => [...(chartsQuery.data ?? [])].sort((a, b) => a.position - b.position), [chartsQuery.data]);
  // Mine: charts I created (editable, draggable). Shared: other people's workspace charts (read-only).
  const isMine = (c: SavedChart) => canEdit && (!c.ownerId || !me || c.ownerId === me);
  const mine = ordered.filter(isMine);
  const shared = ordered.filter((c) => !isMine(c));
  const nextPosition = ordered.reduce((m, c) => Math.max(m, c.position), -1) + 1;

  const fullScreen = ordered.find((c) => c._id === fullScreenId);
  const drillField = drill ? fieldById.get(drill.fieldId) : undefined;

  const onError = (message: string) => (error: unknown) =>
    toast(isAxiosError(error) && error.response?.status === 403 ? "You don't have permission to change charts on this form." : message, 'error');

  async function optimistic(change: (old: SavedChart[]) => SavedChart[]) {
    await queryClient.cancelQueries({ queryKey: listKey });
    const previous = queryClient.getQueryData<SavedChart[]>(listKey);
    queryClient.setQueryData<SavedChart[]>(listKey, (old) => change(old ?? []));
    return { previous };
  }
  const rollback = (ctx?: { previous?: SavedChart[] }) => queryClient.setQueryData(listKey, ctx?.previous);
  const refresh = () => void queryClient.invalidateQueries({ queryKey: listKey });
  const definitionOf = (c: SavedChart): ChartDefinition => ({ fieldId: c.fieldId, type: c.type, size: c.size, title: c.title, options: c.options, visibility: c.visibility });

  const addMutation = useMutation({
    mutationFn: (def: ChartDefinition) => chartsService.create(formId, { ...def, position: nextPosition }, scope),
    onSuccess: () => {
      refresh();
      toast('Chart added to the dashboard.', 'success');
      onAddClose();
    },
    onError: onError('Could not add the chart. Please try again.'),
  });

  const editMutation = useMutation({
    mutationFn: ({ chart, def }: { chart: SavedChart; def: ChartDefinition }) => chartsService.update(formId, chart._id, def, scope),
    onSuccess: () => {
      refresh();
      toast('Chart updated.', 'success');
      setEditing(null);
    },
    onError: onError('Could not save the chart. Please try again.'),
  });

  const duplicateMutation = useMutation({
    mutationFn: (chart: SavedChart) => chartsService.create(formId, { ...definitionOf(chart), title: `${chart.title} (copy)`, visibility: 'private', position: nextPosition }, scope),
    onSuccess: () => {
      refresh();
      toast('Chart duplicated.', 'success');
    },
    onError: onError('Could not duplicate the chart. Please try again.'),
  });

  const resizeMutation = useMutation({
    mutationFn: ({ chart, size }: { chart: SavedChart; size: ChartSize }) => chartsService.update(formId, chart._id, { size }, scope),
    onMutate: ({ chart, size }) => optimistic((old) => old.map((c) => (c._id === chart._id ? { ...c, size } : c))),
    onError: (error, _v, ctx) => {
      rollback(ctx);
      onError('Could not resize the chart.')(error);
    },
    onSettled: refresh,
  });

  const removeMutation = useMutation({
    mutationFn: (chart: SavedChart) => chartsService.remove(formId, chart._id, scope),
    onMutate: (chart) => optimistic((old) => old.filter((c) => c._id !== chart._id)),
    onSuccess: (_d, chart) => {
      // The backend only offers DELETE, so Undo re-creates the chart (same definition and place).
      toast(`Removed "${chart.title}".`, 'success', 8000, {
        label: 'Undo',
        onClick: () =>
          chartsService
            .create(formId, { ...definitionOf(chart), position: chart.position }, scope)
            .then(() => {
              refresh();
              toast('Chart restored.', 'success');
            })
            .catch(onError('Could not restore the chart.')),
      });
    },
    onError: (error, _chart, ctx) => {
      rollback(ctx);
      onError('Could not remove the chart. Please try again.')(error);
    },
    onSettled: refresh,
  });

  const reorderMutation = useMutation({
    mutationFn: (moves: { id: string; position: number }[]) => Promise.all(moves.map((m) => chartsService.update(formId, m.id, { position: m.position }, scope))),
    // Rolled back by the caller (it holds the snapshot); here only the message and a refetch.
    onError: onError('Could not save the new order.'),
    onSettled: refresh,
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = mine.findIndex((c) => c._id === active.id);
    const to = mine.findIndex((c) => c._id === over.id);
    if (from < 0 || to < 0) return;
    const next = arrayMove(mine, from, to).map((c, i) => ({ id: c._id, position: i }));
    const moves = next.filter((n) => mine.find((c) => c._id === n.id)?.position !== n.position);
    const byId = new Map(next.map((n) => [n.id, n.position]));
    void optimistic((old) => old.map((c) => (byId.has(c._id) ? { ...c, position: byId.get(c._id)! } : c))).then((ctx) =>
      reorderMutation.mutate(moves, { onError: () => rollback(ctx) }),
    );
  }

  const titleOf = (id: string | number) => mine.find((c) => c._id === id)?.title ?? 'chart';
  const announcements = {
    onDragStart: ({ active }: { active: { id: string | number } }) => `Picked up chart ${titleOf(active.id)}, position ${mine.findIndex((c) => c._id === active.id) + 1} of ${mine.length}.`,
    onDragOver: ({ active, over }: { active: { id: string | number }; over: { id: string | number } | null }) =>
      over ? `Chart ${titleOf(active.id)} is over position ${mine.findIndex((c) => c._id === over.id) + 1} of ${mine.length}.` : undefined,
    onDragEnd: ({ active, over }: { active: { id: string | number }; over: { id: string | number } | null }) =>
      over ? `Chart ${titleOf(active.id)} dropped at position ${mine.findIndex((c) => c._id === over.id) + 1} of ${mine.length}.` : `Chart ${titleOf(active.id)} dropped where it was.`,
    onDragCancel: ({ active }: { active: { id: string | number } }) => `Reordering cancelled. Chart ${titleOf(active.id)} did not move.`,
  };

  function selectSegment(chart: SavedChart, target: DrillTarget) {
    setDrill({ chartId: chart._id, fieldId: chart.fieldId, target });
  }

  function openResponse(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('responseId', id);
    router.push(`${pathname}?${params.toString()}`); // push: Back closes the response and returns to the panel
  }
  function closeResponse() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('responseId');
    router.replace(`${pathname}?${params.toString()}`);
  }

  const renderCard = (chart: SavedChart, manage: boolean, handle?: ReactNode) => (
    <CustomChartCard
      chart={chart}
      formId={formId}
      scope={scope}
      field={fieldById.get(chart.fieldId)}
      range={range}
      canManage={manage}
      dragHandle={handle}
      onSelect={selectSegment}
      onEdit={setEditing}
      onDuplicate={(c) => duplicateMutation.mutate(c)}
      onRemove={(c) => removeMutation.mutate(c)}
      onResize={(c, size) => resizeMutation.mutate({ chart: c, size })}
      onFullScreen={(c) => setFullScreenId(c._id)}
    />
  );

  const drawerOpen = (addOpen && canEdit) || !!editing;

  return (
    <section aria-labelledby="custom-charts-heading" className="flex flex-col gap-4">
      <h3 id="custom-charts-heading" className="bg-h5 font-bold text-(--text-primary)">Charts</h3>

      {chartsQuery.isLoading ? (
        <div className={GRID} aria-busy="true" aria-label="Loading your charts">
          {(['small', 'small', 'small', 'medium', 'medium'] as ChartSize[]).map((s, i) => (
            <div key={i} className={SPAN[s]}>
              <Card>
                <Skeleton variant="block" height={220} className="w-full rounded-lg" />
              </Card>
            </div>
          ))}
        </div>
      ) : chartsQuery.isError ? (
        status === 403 ? (
          <EmptyState icon={<LockKeyhole />} title="No access" description="You don't have permission to view charts on this form." />
        ) : (
          <EmptyState
            icon={<AlertCircle />}
            title="Unable to load your charts"
            description="The rest of the dashboard is still available."
            actions={<Button variant="secondary" size="small" onClick={() => void chartsQuery.refetch()}>Try again</Button>}
          />
        )
      ) : ordered.length === 0 ? (
        chartable.length === 0 && form ? (
          <EmptyState title="Nothing to chart yet" description="Charts summarise dropdown, multiple choice, checkbox, rating, number and date questions. Add one of those to this form first." />
        ) : canEdit ? (
          <EmptyState
            title="No charts yet"
            description="A chart answers one question about your responses - and clicking part of it shows exactly who answered that way."
            actions={
              <Button onClick={onAddRequest}>
                <Plus size={14} className="mr-1.5" aria-hidden="true" />
                Add chart
              </Button>
            }
          />
        ) : (
          <p className="bg-body-sm text-(--text-muted)">No charts have been shared on this form yet.</p>
        )
      ) : (
        <>
          {mine.length > 0 && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
              accessibility={{
                announcements,
                screenReaderInstructions: { draggable: 'To pick up a chart, press space or enter. Use the arrow keys to move it, then space or enter to drop it, or escape to cancel.' },
              }}
            >
              <SortableContext items={mine.map((c) => c._id)} strategy={rectSortingStrategy}>
                <div className={GRID}>
                  {mine.map((chart) => (
                    <SortableChart key={chart._id} chart={chart}>
                      {(handle) => renderCard(chart, true, handle)}
                    </SortableChart>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
          {shared.length > 0 && (
            <>
              {mine.length > 0 && <h4 className="bg-overline text-(--text-muted)">Shared with the workspace</h4>}
              <div className={GRID}>
                {shared.map((chart) => (
                  <div key={chart._id} className={`${SPAN[chart.size]} min-w-0`}>
                    {renderCard(chart, false)}
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {canEdit && (
        <ChartDrawer
          isOpen={drawerOpen}
          onClose={() => {
            onAddClose();
            setEditing(null);
          }}
          editing={editing}
          formId={formId}
          scope={scope}
          fields={fields}
          range={range}
          canShare={canEdit}
          isSaving={addMutation.isPending || editMutation.isPending}
          onSubmit={(def) => (editing ? editMutation.mutate({ chart: editing, def }) : addMutation.mutate(def))}
        />
      )}

      {fullScreen && (
        <ChartFullScreen
          isOpen={!drill}
          chart={fullScreen}
          field={fieldById.get(fullScreen.fieldId)}
          formId={formId}
          scope={scope}
          range={range}
          onClose={() => setFullScreenId(null)}
          onSelect={(t) => selectSegment(fullScreen, t)}
        />
      )}

      <ChartDrillPanel
        isOpen={!!drill && !responseId}
        drill={drill}
        onClose={() => setDrill(null)}
        formId={formId}
        scope={scope}
        field={drillField}
        range={range}
        granularity={dateGranularity(range.from, range.to)}
        onOpenResponse={openResponse}
      />

      {responseId && <ResponseOverlay responseId={responseId} formId={formId} scope={scope} formTitle={form?.title} onOpen={openResponse} onClose={closeResponse} />}
    </section>
  );
}
