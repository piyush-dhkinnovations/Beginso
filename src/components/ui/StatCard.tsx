import React from "react";
import { bx } from "@/lib/utils";
import {
  ColumnBars,
  DualBars,
  MiniBars,
  MultiLine,
  ProgressBar,
  Ring,
  SplitBar,
  Sparkline,
  StackedBars,
} from "./charts";

/** The graph on the right of a stat card — one of the chart-card styles (see ui/charts). */
export type StatChart =
  | { kind: "bars"; values: number[] }
  | { kind: "dual"; values: number[]; part: number[] }
  | { kind: "stacked"; columns: number[][] }
  | { kind: "columns"; values: number[]; labels: string[] }
  | { kind: "ring"; percent: number }
  | { kind: "progress"; percent: number }
  | { kind: "split"; parts: { value: number; color?: string }[] }
  | { kind: "line"; values: number[]; area?: boolean }
  | { kind: "multi"; values: number[]; secondary: number[] };

function renderChart(chart: StatChart) {
  switch (chart.kind) {
    case "bars": return <MiniBars values={chart.values} />;
    case "dual": return <DualBars values={chart.values} part={chart.part} />;
    case "stacked": return <StackedBars columns={chart.columns} />;
    case "columns": return <ColumnBars values={chart.values} labels={chart.labels} />;
    case "ring": return <Ring percent={chart.percent} />;
    case "progress": return <ProgressBar percent={chart.percent} />;
    case "split": return <SplitBar parts={chart.parts} />;
    case "line": return <Sparkline values={chart.values} area={chart.area ?? true} />;
    case "multi": return <MultiLine values={chart.values} secondary={chart.secondary} />;
  }
}

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
  /** Shown as a large bare icon (no tile). */
  icon?: React.ReactNode;
  /** Muted text after the value, e.g. "/ 4". */
  unit?: React.ReactNode;
  /** `note` is a small muted line under the figure, e.g. "vs previous 30 days". */
  delta?: { label: string; direction: "up" | "down" | "flat"; note?: string };
  /** Optional mini graph on the right: bars for a trend, a ring for a ratio. */
  chart?: StatChart;
  /** Extra classes for the value itself (e.g. a muted colour for a zero). */
  valueClassName?: string;
  horizontal?: boolean;
}

// beginso-ui.css classes — see src/styles/beginso-ui.css §10 CARDS ("Stat / KPI card"): Tinted
// surface, large bare icon, number and label on the left, and an optional split graph on the right
// (bars for a trend, a ring for a ratio). It's a plain div (.bg-card is already flex), so it
// carries its own padding rather than also taking .bg-card-pad.
export function StatCard({
  className,
  label,
  value,
  icon,
  unit,
  delta,
  chart,
  valueClassName,
  horizontal,
  ...props
}: StatCardProps) {
  // A short word ("Just you") would shout at 26px like a number — drop it to text size.
  const isText = typeof value === "string" && value.length > 6 && !/^[\d.,%+\-−–—\s]+$/.test(value);
  const text = (
    <div className="bg-stat-main">
      {!horizontal && icon && <span className="bg-stat-icon">{icon}</span>}
      <span className={bx("bg-stat-value", isText && "bg-stat-value-text", valueClassName)}>
        {value}
        {unit && <span className="bg-stat-unit"> {unit}</span>}
      </span>
      <span className="bg-stat-label">{label}</span>
      {delta && (
        <>
          <span className={bx("bg-delta", `bg-delta-${delta.direction}`)}>{delta.label}</span>
          {delta.note && <span className="bg-caption text-(--text-muted)">{delta.note}</span>}
        </>
      )}
    </div>
  );

  return (
    <div className={bx("bg-card bg-stat", horizontal && "bg-stat-h", className)} {...props}>
      {horizontal && icon && <span className="bg-stat-icon">{icon}</span>}
      {text}
      {chart && (
        <div className="bg-stat-chart">
          {renderChart(chart)}
        </div>
      )}
    </div>
  );
}
