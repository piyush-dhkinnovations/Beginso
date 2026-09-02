"use client";

import { Check } from "lucide-react";
import { useCountUp } from "@/hooks/useCountUp";
import { useReveal } from "@/hooks/useReveal";

const STATS = [
  {
    target: 10,
    label: "Field types",
    bullets: ["Text, email, phone, number", "Date, dropdown, multiple choice", "Checkbox and file upload"],
  },
  {
    target: 0,
    label: "Setup steps for analytics",
    bullets: ["Dashboard on first submission", "Trends, status and per-question", "Filter by any date range"],
  },
  {
    target: 2,
    label: "Export formats",
    bullets: ["CSV streamed directly", "PDF summary reports", "Respects your active filter"],
  },
];

function StatCard({ target, label, bullets }: (typeof STATS)[number]) {
  const { ref, value } = useCountUp(target);
  return (
    <div className="rounded-[var(--bg-radius-md)] border border-[var(--border-default)] bg-[var(--surface-card)] p-6">
      <span ref={ref} className="block text-[48px] font-extrabold text-[var(--primary-600)] tabular-nums leading-none">
        {value}
      </span>
      <div className="bg-body font-semibold text-[var(--text-primary)] mt-2 mb-4">{label}</div>
      <ul className="space-y-2">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-2 bg-body-sm text-[var(--text-secondary)]">
            <Check size={14} className="text-[var(--primary-500)] mt-0.5 shrink-0" />
            {b}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function StatsBar() {
  const { ref: headingRef, visible: headingVisible } = useReveal<HTMLDivElement>();

  return (
    <section className="py-14 md:py-[72px] lg:py-24 bg-[var(--surface-card)] border-y border-[var(--border-default)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div ref={headingRef} className={`reveal ${headingVisible ? "is-visible" : ""} text-center mb-8 md:mb-12 max-w-3xl mx-auto`}>
          <div className="bg-overline text-[var(--primary-600)] mb-3">By the numbers</div>
          <h2 className="bg-h2 text-[var(--text-primary)]">Built to handle the whole job</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STATS.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>
      </div>
    </section>
  );
}
