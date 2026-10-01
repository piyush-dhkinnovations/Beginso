import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { bx } from "@/lib/utils";

export interface ActionCardProps {
  href: string;
  title: string;
  hint?: string;
  /** Rendered large and bare (no tile). */
  icon: React.ReactNode;
  className?: string;
}

// Tinted-surface link card: large bare icon, title, hint, chevron. For "what do you want to do
// next" rows (Home quick actions) — a whole-card link, so it's one tab stop.
export function ActionCard({ href, title, hint, icon, className }: ActionCardProps) {
  return (
    <Link href={href} className={bx("bg-card bg-card-hover flex-row items-center gap-4 p-4 no-underline", className)}>
      <span className="bg-stat-icon mb-0" aria-hidden="true">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block bg-body-sm font-semibold text-(--text-primary)">{title}</span>
        {hint && <span className="block bg-caption text-(--text-muted)">{hint}</span>}
      </span>
      <ChevronRight size={16} className="text-(--text-disabled)" aria-hidden="true" />
    </Link>
  );
}
