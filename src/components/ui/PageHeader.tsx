import React from "react";
import { bx } from "@/lib/utils";
import { Breadcrumb, type BreadcrumbItem } from "./Breadcrumb";

export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  eyebrow?: React.ReactNode;
  description?: React.ReactNode;
  breadcrumb?: BreadcrumbItem[];
  actions?: React.ReactNode;
}

// Composition-only primitive — no dedicated beginso-ui.css section, built from Breadcrumb
// (already a components/ui/ primitive) plus the design system's own generic layout classes
// (.bg-stack/.bg-row/.bg-gap-*, beginso-ui.css §4 LAYOUT) and typography tokens (.bg-h2, .bg-overline),
// not raw Tailwind spacing, per requirements.md 1.1/9. Matches wireframe page heading pattern:
// Breadcrumb -> Eyebrow -> Title -> Description with right-aligned actions.
export function PageHeader({
  title,
  eyebrow,
  description,
  breadcrumb,
  actions,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <div className={bx("bg-stack", "bg-gap-2", className)} {...props}>
      {breadcrumb && breadcrumb.length > 0 && <Breadcrumb items={breadcrumb} />}
      <div className={bx("bg-row", "bg-gap-4", "flex-wrap")} style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <div className={bx("bg-stack", "bg-gap-1")}>
          {eyebrow && <span className="bg-overline">{eyebrow}</span>}
          <h1 className="bg-h2">{title}</h1>
          {description && <p className="bg-body" style={{ color: "var(--text-muted)", margin: 0 }}>{description}</p>}
        </div>
        {actions && (
          <div className={bx("bg-row", "bg-gap-3")}>{actions}</div>
        )}
      </div>
    </div>
  );
}
