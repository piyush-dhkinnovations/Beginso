"use client";

import React from "react";
import { useReveal } from "@/hooks/useReveal";
import { Plus, Link2, QrCode, Smartphone } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { StatusBadge } from "@/components/ui/StatusBadge";

function BuildVisual() {
  return (
    <div className="h-[140px] flex flex-col items-center justify-center gap-1.5">
      {["Full name", "Email address", "Company"].map((label, i) => (
        <div
          key={label}
          className="w-[85%] rounded-[var(--bg-radius-sm)] border border-[var(--border-default)] bg-[var(--surface-hover)] px-3 py-2 text-[11px] text-[var(--text-secondary)]"
          style={{ transform: `translateX(${(i - 1) * 4}px)` }}
        >
          {label}
        </div>
      ))}
      <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--primary-600)]">
        <Plus size={14} />
      </span>
    </div>
  );
}

function ShareVisual() {
  return (
    <div className="h-[140px] flex items-center justify-center gap-4">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--surface-hover)] px-3 py-1.5 text-[10px] text-[var(--text-secondary)] rotate-[-4deg]">
        <Link2 size={12} className="text-[var(--primary-500)]" />
        beginso.com/f/acme
      </span>
      <span className="flex h-14 w-14 items-center justify-center rounded-[var(--bg-radius-sm)] border border-[var(--border-default)] bg-[var(--surface-hover)]">
        <QrCode size={28} className="text-[var(--text-secondary)]" />
      </span>
      <span className="flex h-16 w-9 items-center justify-center rounded-[10px] border-2 border-[var(--border-strong)] rotate-[4deg]">
        <Smartphone size={16} className="text-[var(--text-muted)]" />
      </span>
    </div>
  );
}

function TrackVisual() {
  const rows = [
    { name: "Amelia Ross", status: "new" as const },
    { name: "Marcus Lee", status: "in_progress" as const },
    { name: "Priya Nair", status: "completed" as const },
  ];
  return (
    <div className="h-[140px] flex flex-col justify-center gap-1.5 px-4">
      {rows.map((r) => (
        <div key={r.name} className="flex items-center gap-2 rounded-[var(--bg-radius-sm)] border border-[var(--border-default)] bg-[var(--surface-hover)] px-2.5 py-2">
          <Avatar name={r.name} size="xs" />
          <span className="flex-1 text-left text-[11px] text-[var(--text-primary)] truncate">{r.name}</span>
          <StatusBadge variant={r.status} className="text-[9px] px-1.5 py-0 leading-none">
            {r.status === "new" ? "New" : r.status === "in_progress" ? "In progress" : "Completed"}
          </StatusBadge>
        </div>
      ))}
    </div>
  );
}

const STEPS = [
  { visual: BuildVisual, eyebrow: "Build", title: "Drag the fields you need", body: "Start blank or from a template. Add logic so people only see questions that apply to them." },
  { visual: ShareVisual, eyebrow: "Share", title: "One link, anywhere", body: "A public link, an embed snippet, or a QR code. Works on any screen from 320px up, no login for respondents." },
  { visual: TrackVisual, eyebrow: "Track", title: "Watch it fill up", body: "Responses arrive with status, assignment and notes. The dashboard updates as they land." },
];

function StepCard({ index, step }: { index: number; step: (typeof STEPS)[number] }) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  const Visual = step.visual;
  return (
    <div
      ref={ref}
      className={`reveal-up ${visible ? "is-visible" : ""} flex-1 rounded-[var(--bg-radius-md)] border border-[var(--border-default)] bg-[var(--surface-card)] p-6 text-center`}
      style={{ "--reveal-delay": `${index * 80}ms` } as React.CSSProperties}
    >
      <Visual />
      <div className="bg-overline text-[var(--primary-600)] mb-2">{step.eyebrow}</div>
      <h3 className="bg-h5 text-[var(--text-primary)] mb-2">{step.title}</h3>
      <p className="bg-body-sm text-[var(--text-secondary)]">{step.body}</p>
    </div>
  );
}

export default function HowItWorksSection() {
  const { ref: headingRef, visible: headingVisible } = useReveal<HTMLDivElement>();

  return (
    <section id="how-it-works" className="py-14 md:py-[72px] lg:py-24 bg-[var(--surface-card)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div ref={headingRef} className={`reveal ${headingVisible ? "is-visible" : ""} text-center mb-8 md:mb-12 max-w-3xl mx-auto`}>
          <div className="bg-overline text-[var(--primary-600)] mb-3">How it works</div>
          <h2 className="bg-h2 text-[var(--text-primary)]">Three steps, then it runs itself</h2>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {STEPS.map((step, index) => (
            <StepCard key={step.title} index={index} step={step} />
          ))}
        </div>
      </div>
    </section>
  );
}
