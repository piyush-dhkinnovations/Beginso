import type { ReactNode } from "react";
import Link from "next/link";
import { bx } from "@/lib/utils";

export interface QuickAction {
  label: string;
  href: string;
  icon?: ReactNode;
}

export interface QuickActionsBannerProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  /** The first action is the filled (white) primary one; the rest are outlined. */
  actions: QuickAction[];
  className?: string;
}

// Brand-coloured call-to-action strip: icon tile + heading on the left, action links on the right.
// Real links (not a <Button> inside a <Link>), so keyboard, middle-click and prefetch all work.
// Stacks on narrow widths; the actions wrap instead of overflowing.
export function QuickActionsBanner({ title, description, icon, actions, className }: QuickActionsBannerProps) {
  return (
    <section
      aria-label={title}
      className={bx(
        "relative flex flex-wrap items-center justify-between gap-x-6 gap-y-4 overflow-hidden rounded-2xl px-5 py-4 text-white shadow-md sm:px-6",
        className,
      )}
      style={{ background: "linear-gradient(110deg, var(--primary-700, #1E4FB0) 0%, var(--primary-600, #2A5FC4) 50%, var(--primary-400, #4F8BEF) 100%)" }}
    >
      <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-16 size-56 rounded-full bg-white/10" />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-24 right-24 size-48 rounded-full bg-white/5" />

      <div className="relative flex min-w-0 items-center gap-4">
        {icon && (
          <span className="inline-flex size-12 flex-none items-center justify-center rounded-2xl bg-white shadow-sm [&_svg]:size-6" style={{ color: "var(--primary-600, #2A5FC4)" }}>
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-lg font-semibold leading-6">{title}</h2>
          {description && <p className="text-sm leading-5 text-white/80">{description}</p>}
        </div>
      </div>

      <div className="relative flex flex-wrap items-center gap-2.5">
        {actions.map((a, i) => (
          <Link
            key={a.href + a.label}
            href={a.href}
            className={bx(
              "inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-medium no-underline transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white [&_svg]:size-4",
              i === 0 ? "bg-white shadow-sm hover:bg-white/90" : "border border-white/45 text-white hover:bg-white/10",
            )}
            style={i === 0 ? { color: "var(--primary-700, #1E4FB0)" } : undefined}
          >
            {a.icon}
            {a.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
