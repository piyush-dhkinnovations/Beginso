'use client';

import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, Copy, MoreHorizontal, Pencil, Share2, Trash2, Users } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Menu, type MenuItem } from '@/components/ui/Menu';
import { chartBuilderService } from '@/services/chartBuilder';
import { ChartResult } from './ChartResult';
import { DrillChart } from './DrillChart';
import { DEFAULT_DISPLAY, isDrill } from '@/lib/chartBuilder';
import { SIZES, SIZE_LABEL } from '@/lib/chartOptions';
import { useFormFields } from '@/hooks/useFormFields';
import type { BuilderChartType, DrillStep, QueryEntry } from '@/types/chartBuilder';
import type { ChartSize, SavedChart } from '@/types/charts';

interface BuilderChartCardProps {
  formId: string;
  scope: string;
  chart: SavedChart;
  /** My own chart (or an admin's shared one) and a role that may edit: the menu and the drag handle appear. */
  canManage: boolean;
  dragHandle?: ReactNode;
  /** A part was clicked: on a simple chart its group; on a drill-down the last level's group, or (entry null) all of a level, with the parts clicked on the way. */
  onSelect: (chart: SavedChart, entry: QueryEntry | null, steps: DrillStep[]) => void;
  onEdit: (chart: SavedChart) => void;
  onDuplicate: (chart: SavedChart) => void;
  onToggleShare: (chart: SavedChart) => void;
  onRemove: (chart: SavedChart) => void;
  /** How much of a row the card takes on the dashboard: the same Small / Medium / Large the wizard offers. */
  onResize: (chart: SavedChart, size: ChartSize) => void;
}

/**
 * A chart built in the chart builder, on the Insights dashboard. It asks for its own answer (so one chart failing shows its own message and
 * never blanks the page), shows the chart, and lets a person click a part to see the responses behind it. Removing asks first, in the
 * card itself.
 */
export function BuilderChartCard({ formId, scope, chart, canManage, dragHandle, onSelect, onEdit, onDuplicate, onToggleShare, onRemove, onResize }: BuilderChartCardProps) {
  const [confirming, setConfirming] = useState(false);
  const definition = chart.definition!;
  const drill = isDrill(definition) ? definition : null;
  const fields = useFormFields(formId);
  const display = definition.display ?? DEFAULT_DISPLAY;
  // a drill-down asks for its levels itself (each level is its own answer); a simple chart's answer is the saved chart's
  const data = useQuery({
    queryKey: ['chart-data', scope, formId, chart._id, chart.version ?? 1],
    queryFn: () => chartBuilderService.data(formId, chart._id, scope),
    staleTime: 30_000,
    retry: false,
    enabled: !drill,
  });
  const removed = data.data?.fieldMissing === true || chart.fieldMissing === true;
  const title = chart.title || 'Chart';
  const shared = chart.visibility === 'workspace';

  const items: MenuItem[] = canManage
    ? [
        { id: 'edit', label: 'Edit', icon: <Pencil size={14} />, onSelect: () => onEdit(chart) },
        { id: 'duplicate', label: 'Duplicate', icon: <Copy size={14} />, onSelect: () => onDuplicate(chart) },
        { id: 'share', label: shared ? 'Stop sharing' : 'Share with workspace', icon: shared ? <Users size={14} /> : <Share2 size={14} />, onSelect: () => onToggleShare(chart) },
        ...SIZES.map((s) => ({
          id: `size-${s}`,
          label: `Size: ${SIZE_LABEL[s]}`,
          icon: chart.size === s ? <Check size={14} /> : <span className="inline-block w-3.5" />,
          onSelect: () => onResize(chart, s),
        })),
        { id: 'remove', label: 'Remove', icon: <Trash2 size={14} />, danger: true, onSelect: () => setConfirming(true) },
      ]
    : [];

  return (
    <Card className="h-full gap-3" aria-label={title}>
      <div className="flex items-center gap-2">
        {dragHandle}
        <div className="min-w-0 flex-1">
          <h3 className="truncate bg-body font-semibold text-(--text-primary)" title={title}>
            {title}
          </h3>
          {!canManage && shared && chart.ownerName && <p className="truncate bg-caption text-(--text-muted)">Shared by {chart.ownerName}</p>}
        </div>
        {drill && <Badge variant="neutral">Drill-down</Badge>}
        {shared && canManage && <Badge variant="info">Shared</Badge>}
        {canManage && <Menu align="end" triggerLabel={`Chart options for ${title}`} trigger={<MoreHorizontal size={18} aria-hidden="true" />} items={items} />}
      </div>

      {confirming ? (
        <div role="alertdialog" aria-label={`Remove ${title}?`} className="flex flex-wrap items-center gap-3 rounded-md bg-(--bg-subtle) p-3">
          <p className="bg-body-sm font-medium text-(--text-primary)">Remove this chart?</p>
          <Button variant="secondary" size="small" onClick={() => setConfirming(false)}>
            Cancel
          </Button>
          <Button variant="destructive" size="small" onClick={() => onRemove(chart)}>
            Remove
          </Button>
        </div>
      ) : null}

      {removed ? (
        <div className="flex flex-col items-start gap-3">
          <p className="bg-body-sm text-(--text-muted)">This chart uses a question that was removed. Edit or remove it.</p>
          {canManage && (
            <div className="flex gap-2">
              <Button variant="secondary" size="small" onClick={() => onEdit(chart)}>
                Edit
              </Button>
              <Button variant="secondary" size="small" onClick={() => setConfirming(true)}>
                Remove
              </Button>
            </div>
          )}
        </div>
      ) : drill ? (
        <DrillChart formId={formId} scope={scope} fields={fields} definition={drill} label={title} onSeeResponses={(steps, entry) => onSelect(chart, entry, steps)} />
      ) : (
        <ChartResult
          result={data.data?.query}
          isLoading={data.isLoading}
          isError={data.isError}
          refreshing={data.isFetching && !data.isLoading}
          onRetry={() => void data.refetch()}
          chartType={(chart.type === ('horizontal_bar' as string) ? 'hbar' : chart.type) as unknown as BuilderChartType}
          display={display}
          onSelect={display.interactive ? (entry) => onSelect(chart, entry, []) : undefined}
          label={title}
        />
      )}
    </Card>
  );
}
