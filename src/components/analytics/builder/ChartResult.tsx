'use client';

import { useEffect, useId, useState } from 'react';
import { AlertCircle, ChevronDown, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { BarsChart, LineAreaChart, PieChart } from '@/components/ui/charts';
import { entrySegments, formatFigure, isTimeKind, resolveChartType } from '@/lib/chartBuilder';
import { paletteStyle } from '@/lib/chartPalette';
import { bx } from '@/lib/utils';
import type { BuilderChartType, ChartDisplay, QueryEntry, QueryResult } from '@/types/chartBuilder';

export const FEW_RESPONSES = 10;

interface ChartResultProps {
  /** The answer on screen (the previous one while the next is on its way). */
  result: QueryResult | undefined;
  isLoading: boolean;
  isError: boolean;
  /** A newer answer is being fetched: the chart stays, dimmed. */
  refreshing?: boolean;
  onRetry?: () => void;
  chartType: BuilderChartType;
  display: ChartDisplay;
  /** A click on a group (a bar, a slice, a point, a row of the table). Omit for a chart that only shows. */
  onSelect?: (entry: QueryEntry) => void;
  /** What a click does, in the tooltip (default: shows who answered). */
  selectHint?: string;
  /** Title for assistive tech. */
  label: string;
  height?: number;
}

/**
 * What a chart shows, wherever it appears (the wizard's preview, the dashboard card, the final preview): the picture, a table of the same
 * numbers for people who cannot use the picture, and plain lines under it about the people who did not answer, a short list and so on.
 * Every state has words: loading is a skeleton shaped like the chart, an error says so and can retry, nothing found says so.
 *
 * "Show as a table" does not make the card taller. Cards sit side by side in a row and a row is as tall as its tallest card, so a table
 * that pushed one card down stretched every card next to it. The table takes the chart's own place instead (the chart stays in the layout,
 * hidden, so the space is the same) and scrolls inside it when it is longer.
 */
export function ChartResult({ result, isLoading, isError, refreshing, onRetry, chartType, display, onSelect, selectHint, label, height = 240 }: ChartResultProps) {
  const [tableOpen, setTableOpen] = useState(false);
  const tableId = useId();
  // How tall the chart is, so the table never needs more room than the chart did (kept up to date while the chart resizes).
  const [chartEl, setChartEl] = useState<HTMLDivElement | null>(null);
  const [chartHeight, setChartHeight] = useState<number | undefined>();
  useEffect(() => {
    if (!chartEl || typeof ResizeObserver === 'undefined') return;
    const watch = new ResizeObserver(() => setChartHeight(chartEl.offsetHeight));
    watch.observe(chartEl);
    return () => watch.disconnect();
  }, [chartEl]);

  if (isLoading && !result) return <Skeleton variant="block" height={height} className="w-full rounded-lg" aria-busy="true" />;
  if (isError && !result) {
    return (
      <div role="alert" className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-(--border-default) bg-(--bg-subtle) px-6 py-8 text-center">
        <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-(--bg-sunken) text-(--text-muted)">
          <AlertCircle size={20} />
        </span>
        <div className="flex flex-col gap-0.5">
          <p className="bg-body-sm font-semibold text-(--text-primary)">Couldn&apos;t load this chart.</p>
          <p className="bg-caption text-(--text-muted)">The numbers didn&apos;t come back. Try again in a moment.</p>
        </div>
        {onRetry && (
          <Button variant="secondary" size="small" onClick={onRetry}>
            Try again
          </Button>
        )}
      </div>
    );
  }
  if (!result) return null;

  const warnings = result.warnings.filter((w) => w.code !== 'top_groups');
  const topNote = result.warnings.find((w) => w.code === 'top_groups');
  const type = resolveChartType(chartType, result.level.kind, result.measure.type, result.optionCount);
  const segments = entrySegments(result, display.values, !!onSelect, selectHint);
  const select = onSelect ? (s: { key: string }) => onSelect(result.entries.find((e) => e.key === s.key) ?? result.entries[0]) : undefined;
  const hasData = result.entries.some((e) => e.value > 0 || e.n > 0);
  const based = result.measureAnswered !== null ? ` · based on ${result.measureAnswered.toLocaleString()} ${result.measureAnswered === 1 ? 'answer' : 'answers'}` : '';

  return (
    // flex-1: in a card that is taller than its chart (the cards of a row are the same height) this takes the room that is left; the chart
    // is centred in it, and the notes and the table toggle stay at the bottom
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {warnings.map((w) => (
        <p key={w.code} role="status" className="flex items-start gap-2 rounded-md border border-(--warning-border) bg-(--warning-surface) px-3 py-2 bg-body-sm text-(--text-secondary)">
          <TriangleAlert size={14} className="mt-0.5 shrink-0 text-(--warning-text)" aria-hidden="true" />
          {w.message}
        </p>
      ))}

      {/* the chart and the table share one cell: the cell is as tall as the chart, whichever of the two is showing */}
      <div className="grid flex-1 content-center">
        <div
          ref={setChartEl}
          className={bx('col-start-1 row-start-1 transition-opacity', refreshing && 'opacity-50', tableOpen && 'invisible')}
          aria-busy={refreshing || undefined}
          style={paletteStyle(display.palette)}
        >
          {!hasData ? (
            <p className="flex min-h-40 items-center justify-center text-center bg-body-sm text-(--text-muted)">No responses match yet.</p>
          ) : type === 'donut' ? (
            <PieChart data={segments} ariaLabel={`${label} chart`} onSelect={select} donut legend={display.legend} centreLabel={result.total === 1 ? 'response' : 'responses'} />
          ) : type === 'line' ? (
            <LineAreaChart data={segments} ariaLabel={`${label} chart`} onSelect={select} area height={height} />
          ) : (
            <BarsChart data={segments} ariaLabel={`${label} chart`} onSelect={select} horizontal={type === 'hbar'} height={height} dataLabels={display.dataLabels} byCategory={!isTimeKind(result.level.kind)} legend={display.legend && type === 'bar'} />
          )}
        </div>
        {hasData && tableOpen && (
          // a scrolling area must be reachable with the keyboard, so it is focusable and named
          <div
            role="region"
            aria-label={`${label}: table`}
            tabIndex={0}
            className="col-start-1 row-start-1 min-h-0 overflow-y-auto rounded-lg focus-visible:outline-2 focus-visible:outline-(--border-focus)"
            style={{ maxHeight: Math.max(chartHeight ?? height, 192) }}
          >
            <table id={tableId} className="w-full border-collapse bg-body-sm">
              <caption className="sr-only">{label}</caption>
              <thead>
                <tr className="text-left text-(--text-muted)">
                  <th scope="col" className="sticky top-0 border-b border-(--border-default) bg-(--surface-card) py-1.5 pr-3 font-medium">{result.level.label}</th>
                  <th scope="col" className="sticky top-0 border-b border-(--border-default) bg-(--surface-card) py-1.5 pr-3 text-right font-medium">{result.measure.type === 'count' ? 'Responses' : result.measure.label}</th>
                  <th scope="col" className="sticky top-0 border-b border-(--border-default) bg-(--surface-card) py-1.5 pr-3 text-right font-medium">Share</th>
                  {onSelect && <td className="sticky top-0 w-24 border-b border-(--border-default) bg-(--surface-card)" />}
                </tr>
              </thead>
              <tbody>
                {result.entries.map((e) => (
                  <tr key={e.key} className="border-b border-(--border-subtle)">
                    <th scope="row" className="py-1.5 pr-3 text-left font-normal text-(--text-primary)">{e.label}</th>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{formatFigure(e.value)}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums text-(--text-muted)">{result.measure.type === 'count' || result.measure.type === 'sum' ? `${Math.round(e.share * 1000) / 10}%` : '—'}</td>
                    {onSelect && (
                      <td className="py-1 text-right">
                        <Button variant="ghost" size="small" aria-label={`See responses: ${e.label}`} onClick={() => onSelect(e)}>
                          See responses
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {topNote && <p className="bg-caption text-(--text-muted)">{topNote.message}</p>}
      {result.blank > 0 && <p className="bg-caption text-(--text-muted)">{result.blank.toLocaleString()} {result.blankLabel}</p>}
      {result.total > 0 && result.total < FEW_RESPONSES && (
        <p className="bg-caption text-(--text-muted)">Only {result.total} {result.total === 1 ? 'response' : 'responses'} so far. This gets more useful with more answers.</p>
      )}
      <p className="bg-caption text-(--text-muted)">
        {result.total.toLocaleString()} {result.total === 1 ? 'response' : 'responses'}
        {based}
      </p>

      {hasData && (
        <div>
          <button
            type="button"
            aria-expanded={tableOpen}
            aria-controls={tableOpen ? tableId : undefined}
            onClick={() => setTableOpen((o) => !o)}
            className="inline-flex items-center gap-1 rounded-md bg-body-sm font-medium text-(--text-link) hover:underline focus-visible:outline-2 focus-visible:outline-(--border-focus)"
          >
            Show as a table
            <ChevronDown size={14} className={bx('transition-transform', tableOpen && 'rotate-180')} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
