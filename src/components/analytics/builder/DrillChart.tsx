'use client';

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useChartQuery } from '@/hooks/useChartQuery';
import { CHART_TYPE_NAME, DEFAULT_DISPLAY, labelOfRef, pathOf } from '@/lib/chartBuilder';
import { bx } from '@/lib/utils';
import { ChartResult } from './ChartResult';
import type { FormField } from '@/types/form';
import type { DrillQuery, DrillStep, QueryEntry } from '@/types/chartBuilder';

interface DrillChartProps {
  formId: string;
  scope: string | undefined;
  fields: readonly FormField[] | undefined;
  definition: DrillQuery;
  /** Title for assistive tech. */
  label: string;
  /** The end of the road: a part of the LAST level was clicked (`entry`), or "See these responses" on any level (`entry` is null). */
  onSeeResponses: (steps: DrillStep[], entry: QueryEntry | null) => void;
  /** Lists every level under the chart, with the one on screen marked. */
  showPath?: boolean;
  height?: number;
  enabled?: boolean;
}

/** What makes a drill-down a different chart: the same query with a level's chart type left out, because the type is only how it is drawn. */
const identity = (d: DrillQuery): string => JSON.stringify({ m: d.measure, f: d.filters, l: d.levels.map((l) => [l.field, l.bucket ?? null, l.sort ?? null]) });

/**
 * A chart that opens level by level. It shows level 1; a click on a part asks for that part's responses grouped by level 2 (the server
 * narrows by everything clicked so far), and so on. A breadcrumb above the chart goes back to any earlier level; the last level's click
 * hands over to `onSeeResponses`. The same component draws the wizard's preview and the dashboard card.
 */
export function DrillChart({ formId, scope, fields, definition, label, onSeeResponses, showPath, height = 240, enabled = true }: DrillChartProps) {
  const key = identity(definition);
  // The clicked parts belong to one definition: when the definition changes (the wizard, an edit) they are forgotten.
  const [trail, setTrail] = useState<{ key: string; steps: DrillStep[] }>({ key, steps: [] });
  const steps = trail.key === key ? trail.steps : [];
  const setSteps = (next: DrillStep[]) => setTrail({ key, steps: next });

  const depth = steps.length;
  const q = useChartQuery(formId, scope, definition, enabled, pathOf(steps));
  const result = q.data;
  const level = definition.levels[depth];
  const display = definition.display ?? DEFAULT_DISPLAY;
  const interactive = display.interactive;
  // while the next level is on its way the previous chart stays (dimmed): a click on it must not be read against the wrong level
  const current = result !== undefined && (result.depth ?? 0) === depth;

  const select = (entry: QueryEntry) => {
    if (!current || !result) return;
    if (result.nextLevel) setSteps([...steps, { level: depth, entry }]);
    else onSeeResponses(steps, entry);
  };

  return (
    <div className="flex flex-col gap-3">
      {interactive && (
        <nav aria-label="Drill-down path" className="flex flex-wrap items-center gap-1 bg-body-sm">
          <ol className="m-0 flex list-none flex-wrap items-center gap-1 p-0">
            {[{ label: 'All responses', to: 0 }, ...steps.map((s, i) => ({ label: s.entry.label, to: i + 1 }))].map((crumb, i, all) => {
              const isCurrent = i === all.length - 1;
              return (
                <li key={`${i}-${crumb.label}`} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight size={14} className="text-(--text-muted)" aria-hidden="true" />}
                  {isCurrent ? (
                    <span aria-current="step" className="max-w-48 truncate rounded-md px-1.5 py-0.5 font-semibold text-(--text-primary)">
                      {crumb.label}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSteps(steps.slice(0, crumb.to))}
                      className="max-w-48 truncate rounded-md px-1.5 py-0.5 font-medium text-(--text-link) hover:bg-(--surface-hover) hover:underline focus-visible:outline-2 focus-visible:outline-(--border-focus)"
                    >
                      {crumb.label}
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="bg-caption text-(--text-muted)">
          Level {depth + 1} of {definition.levels.length}
          {result ? `: by ${result.level.label}` : ''}
          {interactive && result && (result.nextLevel ? `. Click a part to see it by ${result.nextLevel.label}.` : '. Click a part to see its responses.')}
        </p>
        {interactive && depth > 0 && current && result && result.total > 0 && (
          <Button variant="ghost" size="small" onClick={() => onSeeResponses(steps, null)}>
            See these {result.total.toLocaleString()} {result.total === 1 ? 'response' : 'responses'}
          </Button>
        )}
      </div>

      <ChartResult
        result={result}
        isLoading={q.isLoading}
        isError={q.isError}
        refreshing={q.isFetching || q.settling}
        onRetry={() => void q.refetch()}
        chartType={level?.chartType ?? 'auto'}
        display={display}
        onSelect={interactive ? select : undefined}
        selectHint={result?.nextLevel ? `Click to see it by ${result.nextLevel.label}` : 'Click to see who answered'}
        label={depth === 0 ? label : `${label}, ${steps.map((s) => s.entry.label).join(', ')}`}
        height={height}
      />

      {showPath && <DrillPathList fields={fields} definition={definition} depth={depth} />}
    </div>
  );
}

/** "Drill-down path": every level in order (number, field, how it is drawn), the one on screen marked. */
export function DrillPathList({ fields, definition, depth }: { fields: readonly FormField[] | undefined; definition: DrillQuery; depth: number }) {
  return (
    <section aria-label="Drill-down path levels" className="flex flex-col gap-2 rounded-lg border border-(--border-default) bg-(--bg-subtle) p-3">
      <h4 className="bg-body-sm font-semibold text-(--text-primary)">Drill-down path</h4>
      <ol className="m-0 flex list-none flex-col gap-1.5 p-0">
        {definition.levels.map((l, i) => (
          <li key={i} aria-current={i === depth ? 'step' : undefined} className="flex items-center gap-2 bg-body-sm">
            <span
              aria-hidden="true"
              className={bx('flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-caption font-semibold', i === depth ? 'bg-(--action-primary) text-(--text-on-brand)' : 'bg-(--accent-soft) text-(--accent-soft-text)')}
            >
              {i + 1}
            </span>
            <span className="min-w-0 flex-1 truncate text-(--text-primary)">{labelOfRef(fields, l.field)}</span>
            <span className="shrink-0 text-(--text-muted)">{l.chartType ? CHART_TYPE_NAME[l.chartType] : 'Automatic'}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
