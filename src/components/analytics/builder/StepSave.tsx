'use client';

import { Segmented } from '@/components/ui/Segmented';
import { Switch } from '@/components/ui/Switch';
import { StepSection } from './StepSection';
import { DEFAULT_DISPLAY, percentAvailable } from '@/lib/chartBuilder';
import { PALETTES } from '@/lib/chartPalette';
import { bx } from '@/lib/utils';
import type { WizardState } from './wizardState';
import type { BuilderChartSize, ChartDisplay, Palette } from '@/types/chartBuilder';

const SIZES: { id: BuilderChartSize; name: string; hint: string }[] = [
  { id: 'small', name: 'Small', hint: '1/3 of the row' },
  { id: 'medium', name: 'Medium', hint: '1/2 of the row' },
  { id: 'large', name: 'Large', hint: 'Full width' },
];

interface StepSaveProps {
  state: WizardState;
  onChange: (patch: Partial<WizardState>) => void;
  /** Sharing is for people who may edit the form, and only inside a workspace. */
  canShare: boolean;
}

/** Step 4: how the chart looks (values, legend, labels, colours), how big it is on the dashboard, and who sees it. */
export function StepSave({ state, onChange, canShare }: StepSaveProps) {
  const display: ChartDisplay = state.query.display ?? DEFAULT_DISPLAY;
  const setDisplay = (patch: Partial<ChartDisplay>) => onChange({ query: { ...state.query, display: { ...display, ...patch } } });
  const percentOk = percentAvailable(state.query.measure.type);

  return (
    <div className="flex flex-col gap-5">
      <StepSection id="display-heading" title="Display settings" description="What the numbers say and how the chart is coloured.">
        {/* one list: each setting on its own line, its control at the right */}
        <div className="flex flex-col divide-y divide-(--border-subtle) rounded-lg border border-(--border-default)">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-2.5">
            <div className="min-w-0">
              <span id="values-label" className="bg-body-sm text-(--text-primary)">
                Show values as
              </span>
              {!percentOk && <p className="bg-caption text-(--text-muted)">Percentages are available for counts and sums.</p>}
            </div>
            <Segmented
              ariaLabel="Show values as"
              options={[
                { id: 'counts', label: 'Counts' },
                { id: 'percent', label: 'Percentages' },
              ]}
              value={percentOk ? display.values : 'counts'}
              onChange={(id) => percentOk && setDisplay({ values: id as ChartDisplay['values'] })}
              className={bx(!percentOk && 'pointer-events-none opacity-50')}
            />
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-2.5">
            <label htmlFor="show-legend" className="bg-body-sm text-(--text-primary)">
              Show legend
            </label>
            <Switch id="show-legend" checked={display.legend} onChange={(legend) => setDisplay({ legend })} />
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-2.5">
            <label htmlFor="show-labels" className="bg-body-sm text-(--text-primary)">
              Show data labels
            </label>
            <Switch id="show-labels" checked={display.dataLabels} onChange={(dataLabels) => setDisplay({ dataLabels })} />
          </div>
          {state.kind === 'drilldown' && (
            <div className="flex items-start justify-between gap-3 px-4 py-2.5">
              <div className="min-w-0">
                <label htmlFor="interactive-drill" className="bg-body-sm text-(--text-primary)">
                  Interactive drill-down
                </label>
                <p id="interactive-hint" className="bg-caption text-(--text-muted)">
                  {display.interactive ? 'A click on a part opens the next level, and after the last level its responses.' : 'The chart shows level 1 only, and cannot be clicked.'}
                </p>
              </div>
              <Switch id="interactive-drill" checked={display.interactive} aria-describedby="interactive-hint" onChange={(interactive) => setDisplay({ interactive })} />
            </div>
          )}
        </div>

        <fieldset className="flex flex-col gap-2 border-0 p-0">
          <legend className="bg-label">Color palette</legend>
          <div className="flex flex-wrap gap-2">
            {PALETTES.map((p) => {
              const selected = display.palette === p.id;
              return (
                <label
                  key={p.id}
                  className={bx(
                    'flex cursor-pointer items-center gap-2 rounded-lg border-2 px-2.5 py-1.5 bg-body-sm has-focus-visible:outline-2 has-focus-visible:outline-(--border-focus)',
                    selected ? 'border-(--action-primary) bg-(--accent-soft)' : 'border-(--border-default) hover:bg-(--surface-hover)',
                  )}
                >
                  <input type="radio" name="chart-palette" className="sr-only" checked={selected} onChange={() => setDisplay({ palette: p.id as Palette })} />
                  <span className="flex" aria-hidden="true">
                    {(p.dots.length ? p.dots.slice(0, 4) : ['var(--action-primary)', 'var(--info)', 'var(--success)', 'var(--warning)']).map((c, i) => (
                      <span key={i} className="-ml-1 h-4 w-4 rounded-full border border-(--surface-card) first:ml-0" style={{ backgroundColor: c }} />
                    ))}
                  </span>
                  {p.name}
                </label>
              );
            })}
          </div>
        </fieldset>
      </StepSection>

      <StepSection id="size-heading" title="Size on the dashboard" description="How much of a row the chart takes.">
        <fieldset className="border-0 p-0">
          <legend className="sr-only">Chart size on dashboard</legend>
          <div className="grid grid-cols-3 gap-2">
            {SIZES.map((s) => {
              const selected = state.size === s.id;
              return (
                <label
                  key={s.id}
                  className={bx(
                    'flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 px-2 py-2.5 text-center has-focus-visible:outline-2 has-focus-visible:outline-(--border-focus)',
                    selected ? 'border-(--action-primary) bg-(--accent-soft)' : 'border-(--border-default) hover:bg-(--surface-hover)',
                  )}
                >
                  <input type="radio" name="chart-size" className="sr-only" checked={selected} onChange={() => onChange({ size: s.id })} />
                  <span aria-hidden="true" className="flex h-5 w-full max-w-20 gap-0.5">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className={bx('flex-1 rounded-sm', (s.id === 'small' ? i === 0 : s.id === 'medium' ? i < 2 : true) ? 'bg-(--action-primary)' : 'bg-(--bg-sunken)')} />
                    ))}
                  </span>
                  <span className="bg-body-sm font-semibold text-(--text-primary)">{s.name}</span>
                  <span className="bg-caption text-(--text-muted)">{s.hint}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      </StepSection>

      {canShare && (
        <StepSection id="share-heading" title="Who can see it" description="A new chart is private until you share it.">
          <div className="flex items-start justify-between gap-3 rounded-lg border border-(--border-default) px-4 py-3">
            <div className="min-w-0">
              <label htmlFor="share-chart" className="bg-body-sm font-medium text-(--text-primary)">
                Share with workspace
              </label>
              <p id="share-hint" className="bg-caption text-(--text-muted)">
                {state.shared ? 'Everyone who can open this form’s Insights can see this chart. Only you and admins can change it.' : 'Only you can see this chart.'}
              </p>
            </div>
            <Switch id="share-chart" checked={state.shared} aria-describedby="share-hint" onChange={(shared) => onChange({ shared })} />
          </div>
        </StepSection>
      )}
    </div>
  );
}
