'use client';

import type { ReactNode } from 'react';
import { Check, Copy, Maximize2, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Menu, type MenuItem } from '@/components/ui/Menu';
import { ChartBody } from './ChartBody';
import type { DrillTarget } from './ChartView';
import { useFieldDistribution } from '@/hooks/useFieldDistribution';
import { CHART_TYPE_LABEL, SIZE_LABEL, SIZES } from '@/lib/chartOptions';
import type { AnalyticsRangeParams } from '@/lib/queryKeys';
import type { ChartSize, SavedChart } from '@/types/charts';
import type { FormField } from '@/types/form';

interface CustomChartCardProps {
  formId: string;
  scope: string;
  chart: SavedChart;
  /** The form field this chart summarises; undefined = the field was deleted. */
  field?: FormField;
  range: AnalyticsRangeParams;
  /** Own chart + an editing role: edit, resize, duplicate, remove, drag. Everyone else is read-only. */
  canManage: boolean;
  dragHandle?: ReactNode;
  onSelect: (chart: SavedChart, target: DrillTarget) => void;
  onEdit: (chart: SavedChart) => void;
  onDuplicate: (chart: SavedChart) => void;
  onRemove: (chart: SavedChart) => void;
  onResize: (chart: SavedChart, size: ChartSize) => void;
  onFullScreen: (chart: SavedChart) => void;
}

// Each card owns its own data query, so one chart failing shows its own error and never blanks the page.
export function CustomChartCard({ formId, scope, chart, field, range, canManage, dragHandle, onSelect, onEdit, onDuplicate, onRemove, onResize, onFullScreen }: CustomChartCardProps) {
  const fieldGone = chart.fieldMissing === true || !field;
  const query = useFieldDistribution({ scope, formId, field, range, enabled: !fieldGone });
  const title = chart.title || field?.label || 'Chart';

  const items: MenuItem[] = [
    { id: 'fullscreen', label: 'Full screen', icon: <Maximize2 size={14} />, onSelect: () => onFullScreen(chart), disabled: fieldGone },
    ...(canManage
      ? ([
          { id: 'edit', label: 'Edit', icon: <Pencil size={14} />, onSelect: () => onEdit(chart), disabled: fieldGone },
          { id: 'duplicate', label: 'Duplicate', icon: <Copy size={14} />, onSelect: () => onDuplicate(chart), disabled: fieldGone },
          ...SIZES.map((s) => ({
            id: `size-${s}`,
            label: `Size: ${SIZE_LABEL[s]}`,
            icon: chart.size === s ? <Check size={14} /> : <span className="inline-block w-3.5" />,
            onSelect: () => onResize(chart, s),
          })),
          { id: 'remove', label: 'Remove', icon: <Trash2 size={14} />, danger: true, onSelect: () => onRemove(chart) },
        ] satisfies MenuItem[])
      : []),
  ];

  return (
    <Card className="h-full gap-3" aria-label={title}>
      <div className="flex items-center gap-2">
        {dragHandle}
        <div className="min-w-0 flex-1">
          <h3 className="truncate bg-body font-semibold text-(--text-primary)" title={title}>{fieldGone ? 'Question removed' : title}</h3>
          <p className="truncate bg-caption text-(--text-muted)">
            {fieldGone ? title : CHART_TYPE_LABEL[chart.type]}
            {chart.visibility === 'workspace' && !canManage && chart.ownerName ? ` · shared by ${chart.ownerName}` : ''}
          </p>
        </div>
        {chart.visibility === 'workspace' && canManage && <Badge variant="info">Shared</Badge>}
        <Menu
          align="end"
          triggerLabel={`Chart options for ${title}`}
          trigger={<MoreHorizontal size={18} aria-hidden="true" />}
          items={items}
        />
      </div>

      {fieldGone ? (
        <div className="flex flex-col items-start gap-3">
          <p className="bg-body-sm text-(--text-muted)">The question this chart summarised was deleted from the form. Remove the chart to tidy up.</p>
          {canManage && (
            <Button variant="secondary" size="small" onClick={() => onRemove(chart)}>
              <Trash2 size={14} className="mr-1.5" aria-hidden="true" />
              Remove
            </Button>
          )}
        </div>
      ) : (
        <ChartBody def={chart} field={field} query={query} onSelect={(t) => onSelect(chart, t)} />
      )}
    </Card>
  );
}
