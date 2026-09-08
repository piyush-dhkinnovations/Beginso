import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { bx } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbProps extends React.HTMLAttributes<HTMLElement> {
  items: BreadcrumbItem[];
}

// beginso-ui.css §12 NAVIGATION ("Breadcrumb"). Uses next/link for client-side navigation.
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
              <Link href={item.href}>{item.label}</Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
