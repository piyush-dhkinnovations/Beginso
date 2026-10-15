"use client";

import React from "react";
import { useReveal } from "@/hooks/useReveal";
import { Plus, Link2, QrCode, Smartphone } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { StatusBadge } from "@/components/ui/StatusBadge";

function BuildVisual() {
  return (
    <div className="h-35 flex flex-col items-center justify-center gap-1.5">
      {["Full name", "Email address", "Company"].map((label, i) => (
        <div
          key={label}
          className="w-[85%] rounded-(--bg-radius-sm) border border-(--border-default) bg-(--surface-hover) px-3 py-2 bg-caption text-(--text-secondary)"
          style={{ transform: `translateX(${(i - 1) * 4}px)` }}
        >
          {label}
        </div>
      ))}
      <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-(--accent-soft) text-(--text-link)">
        <Plus size={14} />
      </span>
    </div>
  );
}

function ShareVisual() {
  return (
    <div className="h-35 flex items-center justify-center gap-4">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-(--border-default) bg-(--surface-hover) px-3 py-1.5 bg-caption text-(--text-secondary) rotate-[-4deg]">
        <Link2 size={12} className="text-(--action-primary)" />
        beginso.com/f/acme
      </span>
      <span className="flex h-14 w-14 items-center justify-center rounded-(--bg-radius-sm) border border-(--border-default) bg-(--surface-hover)">
        <QrCode size={28} className="text-(--text-secondary)" />
      </span>
      <span className="flex h-16 w-9 items-center justify-center rounded-[10px] border-2 border-(--border-strong) rotate-[4deg]">
        <Smartphone size={16} className="text-(--text-muted)" />
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
    <div className="h-35 flex flex-col justify-center gap-1.5 px-4">
      {rows.map((r) => (
        <div key={r.name} className="flex items-center gap-2 rounded-(--bg-radius-sm) border border-(--border-default) bg-(--surface-hover) px-2.5 py-2">
          <Avatar name={r.name} alt="" size="xs" />
          <span className="flex-1 text-left bg-caption text-(--text-primary) truncate">{r.name}</span>
          <StatusBadge variant={r.status} className="bg-caption px-1.5 py-0 leading-none">
            {r.status === "new" ? "New" : r.status === "in_progress" ? "In progress" : "Completed"}
          </StatusBadge>
        </div>
      ))}
    </div>
  );
}

const STEPS = [
  { visual: BuildVisual, eyebrow: "Build", title: "Drag the fields you need", body: "Start blank or from a template, with no account. Your draft stays on this device for 30 days." },
  { visual: ShareVisual, eyebrow: "Share", title: "One link, anywhere", body: "A public link, an embed snippet, or a QR code. Works on any screen from 320px up, no login for respondents." },
  { visual: TrackVisual, eyebrow: "Track", title: "Watch it fill up", body: "Responses arrive with status, assignment and notes. The dashboard updates as they land." },
];

function StepCard({ index, step }: { index: number; step: (typeof STEPS)[number] }) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  const Visual = step.visual;
  return (
    <div
      ref={ref}
      className={`reveal-up ${visible ? "is-visible" : ""} flex-1 rounded-(--bg-radius-md) border border-(--border-default) bg-(--surface-card) p-6 text-center`}
      style={{ "--reveal-delay": `${index * 80}ms` } as React.CSSProperties}
    >
      <Visual />
      <h3 className="bg-h5 text-(--text-primary) mb-2">{step.eyebrow}: {step.title}</h3>
      <p className="bg-body-sm text-(--text-secondary)">{step.body}</p>
    </div>
  );
}

export default function HowItWorksSection() {
  const { ref: headingRef, visible: headingVisible } = useReveal<HTMLDivElement>();

  return (
    <section id="how-it-works" className="py-14 md:py-[72px] lg:py-24 bg-(--surface-card)">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div ref={headingRef} className={`reveal ${headingVisible ? "is-visible" : ""} text-center mb-8 md:mb-12 max-w-3xl mx-auto`}>
          <h2 className="bg-h2 text-(--text-primary)">Build, share, track</h2>
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
