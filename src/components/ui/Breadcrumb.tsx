import React from "react";
import { ChevronRight } from "lucide-react";
import { bx } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbProps extends React.HTMLAttributes<HTMLElement> {
  items: BreadcrumbItem[];
}

// beginso-ui.css §12 NAVIGATION ("Breadcrumb").
export function Breadcrumb({ items, className, ...props }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={bx("bg-breadcrumb", className)} {...props}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <React.Fragment key={`${item.label}-${i}`}>
            {i > 0 && <ChevronRight className="bg-icon" aria-hidden="true" />}
            {isLast || !item.href ? (
              <span aria-current={isLast ? "page" : undefined}>{item.label}</span>
            ) : (
              <a href={item.href}>{item.label}</a>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
