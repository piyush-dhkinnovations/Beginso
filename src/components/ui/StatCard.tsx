import React from "react";
import { bx } from "@/lib/utils";

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  delta?: { label: string; direction: "up" | "down" | "flat" };
  horizontal?: boolean;
}

// beginso-ui.css classes — see src/styles/beginso-ui.css §10 CARDS ("Stat / KPI card") and §16
// STAT CARD VARIANTS. .bg-stat already sets its own padding/gap (matching .bg-card-pad's padding,
// tighter gap) — no need to also apply .bg-card-pad.
export function StatCard({
  className,
  label,
  value,
  icon,
  delta,
  horizontal,
  ...props
}: StatCardProps) {
  return (
    <div className={bx("bg-card bg-stat", horizontal && "bg-stat-h", className)} {...props}>
      <div className="bg-stat-top">
        <span className="bg-stat-label">{label}</span>
        {icon && <span className="bg-stat-icon">{icon}</span>}
      </div>
      <span className="bg-stat-value">{value}</span>
      {delta && (
        <div className="bg-stat-foot">
          <span className={bx("bg-delta", `bg-delta-${delta.direction}`)}>{delta.label}</span>
        </div>
      )}
    </div>
  );
}
