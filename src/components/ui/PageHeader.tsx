import React from "react";
import { bx } from "@/lib/utils";
import { Breadcrumb, type BreadcrumbItem } from "./Breadcrumb";

export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  breadcrumb?: BreadcrumbItem[];
  actions?: React.ReactNode;
}

// Composition-only primitive — no dedicated beginso-ui.css section, built from Breadcrumb
// (already a components/ui/ primitive) plus the design system's own generic layout classes
// (.bg-stack/.bg-row/.bg-gap-*, beginso-ui.css §4 LAYOUT), not raw Tailwind spacing, per
// requirements.md 1.1/9. Shape every later V2 page-level header uses (requirements.md 2.4).
export function PageHeader({ title, breadcrumb, actions, className, ...props }: PageHeaderProps) {
  return (
    <div className={bx("bg-stack", "bg-gap-2", className)} {...props}>
      {breadcrumb && breadcrumb.length > 0 && <Breadcrumb items={breadcrumb} />}
      <div className={bx("bg-row", "bg-gap-4")} style={{ justifyContent: "space-between" }}>
        <h1 className="bg-h2">{title}</h1>
        {actions && (
          <div className={bx("bg-row", "bg-gap-3")}>{actions}</div>
        )}
      </div>
    </div>
  );
}
