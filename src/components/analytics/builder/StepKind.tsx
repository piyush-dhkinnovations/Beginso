'use client';

import { Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { bx } from '@/lib/utils';
import { DrillChartArt, SimpleChartArt } from './ChartArt';

interface Option {
  id: 'simple' | 'drilldown';
  title: string;
  description: string;
  bullets: string[];
  art: React.ReactNode;
}

const OPTIONS: Option[] = [
  {
    id: 'simple',
    title: 'Simple chart',
    description: 'Create one chart using a field, an aggregation and optional filters.',
    bullets: ['One level chart', 'Quick and easy', 'Great for basic analysis'],
    art: <SimpleChartArt />,
  },
  {
    id: 'drilldown',
    title: 'Drill-down chart',
    description: 'Create an interactive chart with multiple levels. Click a data point to explore deeper.',
    bullets: ['Two or more levels', 'Explore data step by step', 'Perfect for detailed analysis'],
    art: <DrillChartArt />,
  },
];

const HOW_IT_WORKS = [
  { title: 'Pick a type', text: 'One chart, or one you can open level by level.' },
  { title: 'Name it', text: 'Give it a title and say what to group the responses by.' },
  { title: 'Set it up', text: 'Choose how to measure, sort and which responses count, and for a drill-down its levels.' },
  { title: 'Save', text: 'Check the preview, then it joins your dashboard.' },
];

interface StepKindProps {
  value: 'simple' | 'drilldown' | null;
  onChange: (kind: 'simple' | 'drilldown') => void;
  onContinue: () => void;
}

/** Step 1: Simple chart or Drill-down chart, each a card with a picture; Continue on a card chooses it and goes on. */
export function StepKind({ value, onChange, onContinue }: StepKindProps) {
  return (
    <div className="flex flex-col gap-6">
      <div role="radiogroup" aria-label="Chart type" className="grid gap-5 md:grid-cols-2">
        {OPTIONS.map((o) => {
          const selected = value === o.id;
          return (
            <label
              key={o.id}
              className={bx(
                'group relative flex flex-col overflow-hidden rounded-2xl border-2 bg-(--surface-card) transition-[border-color,box-shadow]',
                'cursor-pointer hover:shadow-(--shadow-md)',
                selected ? 'border-(--action-primary) shadow-(--shadow-md)' : 'border-(--border-default) hover:border-(--border-strong)',
                'has-focus-visible:outline-2 has-focus-visible:outline-(--border-focus)',
              )}
            >
              <input type="radio" name="chart-kind" value={o.id} checked={selected} onChange={() => onChange(o.id)} className="sr-only" />

              <div className="flex h-36 w-full items-center justify-center px-5 pt-5">{o.art}</div>

              <div className="flex flex-1 flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 bg-h5 font-bold text-(--text-primary)">
                      {o.title}
                    </p>
                    <p className="mt-1 bg-body-sm text-(--text-muted)">{o.description}</p>
                  </div>
                  <span
                    aria-hidden="true"
                    className={bx('mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2', selected ? 'border-(--action-primary)' : 'border-(--border-strong)')}
                  >
                    {selected && <span className="h-2.5 w-2.5 rounded-full bg-(--action-primary)" />}
                  </span>
                </div>

                <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                  {o.bullets.map((b) => (
                    <li key={b} className="flex items-center gap-2 bg-body-sm text-(--text-secondary)">
                      <span aria-hidden="true" className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-(--accent-soft) text-(--accent-soft-text)">
                        <Check size={12} strokeWidth={3} />
                      </span>
                      {b}
                    </li>
                  ))}
                </ul>

                <Button
                  type="button"
                  variant="primary"
                  className="mt-auto w-full"
                  onClick={(e) => {
                    e.preventDefault();
                    onChange(o.id);
                    onContinue();
                  }}
                >
                  Continue
                </Button>
              </div>
            </label>
          );
        })}
      </div>

      <section aria-labelledby="how-it-works" className="rounded-2xl border border-(--border-default) bg-(--bg-subtle) p-4">
        <h3 id="how-it-works" className="bg-body font-semibold text-(--text-primary)">
          How it works
        </h3>
        <ol className="m-0 mt-3 grid list-none gap-3 p-0 sm:grid-cols-2 xl:grid-cols-4">
          {HOW_IT_WORKS.map((s, i) => (
            <li key={s.title} className="flex gap-3">
              <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-(--accent-soft) bg-body-sm font-semibold text-(--accent-soft-text)">
                {i + 1}
              </span>
              <span className="min-w-0">
                <span className="block bg-body-sm font-semibold text-(--text-primary)">{s.title}</span>
                <span className="block bg-caption text-(--text-muted)">{s.text}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
