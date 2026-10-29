'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useChartQuery } from '@/hooks/useChartQuery';
import { DEFAULT_DISPLAY, isDrill, levelAsSimple } from '@/lib/chartBuilder';
import { ChartResult } from './ChartResult';
import { DrillChart } from './DrillChart';
import { definitionOf, effectiveTitle, type WizardState } from './wizardState';
import type { FormField } from '@/types/form';
import type { DrillQuery, DrillStep, QueryEntry } from '@/types/chartBuilder';

interface DrillPreviewCardProps {
  formId: string;
  scope: string | undefined;
  fields: readonly FormField[] | undefined;
  state: WizardState;
  heading?: string;
  /** The last step lists the levels under the chart. */
  showPath?: boolean;
  /** The level being edited (0 = the first). Level 1 is the working drill-down; any other level is drawn on its own. */
  level?: number;
  /** From a level shown on its own back to the working drill-down. */
  onFull?: () => void;
}

/** Before the levels are added there is nothing to draw: say so, and where it comes from. */
export function DrillPlaceholder() {
  return (
    <Card className="flex min-h-60 flex-col items-center justify-center gap-1 text-center" role="region" aria-label="Preview">
      <p className="bg-body font-semibold text-(--text-primary)">Preview</p>
      <p className="max-w-sm bg-body-sm text-(--text-muted)">Add the levels in the next step to see your chart preview.</p>
    </Card>
  );
}

/**
 * One level of the drill-down as a chart of its own, counting all responses: how that level's field and chart type will look,
 * without clicking through the levels above it to get there.
 */
function LevelOnly({ formId, scope, definition, depth, label, onFull }: { formId: string; scope: string | undefined; definition: DrillQuery; depth: number; label: string; onFull?: () => void }) {
  const q = useChartQuery(formId, scope, levelAsSimple(definition, depth));
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="bg-caption text-(--text-muted)">
          Level {depth + 1} of {definition.levels.length}
          {q.data ? `: by ${q.data.level.label}` : ''}. Shown on its own, counting all responses.
        </p>
        {onFull && (
          <Button variant="ghost" size="small" onClick={onFull}>
            Try the whole drill-down
          </Button>
        )}
      </div>
      <ChartResult
        result={q.data}
        isLoading={q.isLoading}
        isError={q.isError}
        refreshing={q.isFetching || q.settling}
        onRetry={() => void q.refetch()}
        chartType={definition.levels[depth]?.chartType ?? 'auto'}
        display={definition.display ?? DEFAULT_DISPLAY}
        label={`${label}, level ${depth + 1}`}
        height={240}
      />
    </div>
  );
}

/**
 * The drill-down as the dashboard will show it, working: click a part to go a level deeper, use the path above the chart to go back.
 * When a later level is being edited the card shows that level on its own instead, so a field or a chart type chosen there is seen at once.
 * The responses behind a part open in a side screen on the dashboard; in the wizard the chart is not saved yet, so this says how many.
 */
export function DrillPreviewCard({ formId, scope, fields, state, heading = 'Interactive preview', showPath, level = 0, onFull }: DrillPreviewCardProps) {
  const definition = definitionOf(state);
  const title = effectiveTitle(fields, state);
  const [seen, setSeen] = useState<{ n: number | null; label: string } | null>(null);
  if (!isDrill(definition)) return null;

  const onSee = (steps: DrillStep[], entry: QueryEntry | null) => {
    const trail = [...steps.map((s) => s.entry.label), ...(entry ? [entry.label] : [])].join(' › ');
    setSeen({ n: entry ? entry.n : null, label: trail });
  };
  const single = level > 0 && level < definition.levels.length;

  return (
    <Card className="flex flex-col gap-4" aria-label={single ? `Level ${level + 1} preview` : heading} role="region">
      <div className="min-w-0">
        <h3 className="bg-body font-semibold text-(--text-primary)">{single ? `Level ${level + 1} preview` : heading}</h3>
        <p className="break-words bg-body-sm text-(--text-muted)">{title || 'Untitled chart'}</p>
      </div>
      {single ? (
        <LevelOnly formId={formId} scope={scope} definition={definition} depth={level} label={title || 'Chart'} onFull={onFull} />
      ) : (
        <DrillChart formId={formId} scope={scope} fields={fields} definition={definition} label={title || 'Chart'} onSeeResponses={onSee} showPath={showPath} />
      )}
      {!single && seen && (
        <p role="status" className="rounded-md bg-(--bg-subtle) px-3 py-2 bg-body-sm text-(--text-secondary)">
          {seen.n !== null ? `${seen.n.toLocaleString()} ${seen.n === 1 ? 'response' : 'responses'} for ${seen.label}. ` : `${seen.label}. `}
          On the dashboard they open in a side screen.
        </p>
      )}
    </Card>
  );
}
