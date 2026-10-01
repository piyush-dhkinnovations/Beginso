import type { ReactNode } from "react";
import { Card } from "../Card";
import { bx } from "@/lib/utils";

export interface ChartCardProps {
  title: string;
  /** Right-aligned header content, e.g. a legend or a range label. */
  legend?: ReactNode;
  children: ReactNode;
  className?: string;
}

// Titled card for the larger charts: Tinted surface (via Card), a heading row, then the chart.
export function ChartCard({ title, legend, children, className }: ChartCardProps) {
  return (
    <Card className={bx("gap-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="bg-body font-semibold text-(--text-primary)">{title}</h3>
        {legend}
      </div>
      {children}
    </Card>
  );
}

export function LegendDots({ items }: { items: { label: string; color: string }[] }) {
  return (
    <span className="flex flex-wrap gap-4 bg-caption text-(--text-muted)">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: i.color }} aria-hidden="true" />
          {i.label}
        </span>
      ))}
    </span>
  );
}
