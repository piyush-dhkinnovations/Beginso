"use client";

import React from "react";
import { useReveal } from "@/hooks/useReveal";
import { Avatar } from "@/components/ui/Avatar";
import { personById, type PersonId } from "./data/people";
import {
  MousePointer2,
  Type,
  Mail,
  Calendar,
  List,
  CheckSquare,
  Upload,
  ArrowUp,
  ArrowDown,
  FileText,
  Download,
  Loader2,
  Clock,
} from "lucide-react";

const TOOLBOX_ICONS = [Type, Mail, Calendar, List, CheckSquare, Upload];

function BuilderVisual() {
  return (
    <div className="flex gap-2 rounded-(--bg-radius-sm) border border-(--border-default) bg-(--surface-hover) p-3 h-full">
      <div className="hidden sm:flex flex-col gap-1.5 shrink-0">
        {TOOLBOX_ICONS.map((Icon, i) => (
          <span
            key={i}
            className="h-6 w-6 rounded-(--bg-radius-sm) border border-(--border-default) bg-(--surface-card) flex items-center justify-center"
          >
            <Icon size={12} className="text-(--text-muted)" />
          </span>
        ))}
      </div>
      <div className="flex-1 space-y-1.5">
        {["Full name", "Email address", "Company"].map((label) => (
          <div key={label} className="rounded-(--bg-radius-sm) border border-(--border-default) bg-(--surface-card) px-2.5 py-1.5 bg-caption text-(--text-secondary)">
            {label}
          </div>
        ))}
        <div className="border-t border-dashed border-(--border-strong) pt-1.5">
          <div className="rounded-(--bg-radius-sm) border border-(--border-default) bg-(--surface-card) px-2.5 py-1.5 bg-caption text-(--text-secondary)">
            Team size
          </div>
        </div>
        <div className="relative rounded-(--bg-radius-sm) border-2 border-dashed border-(--border-focus) bg-(--accent-soft) px-2.5 py-1.5 bg-caption text-(--accent-soft-text) rotate-2 shadow-(--shadow-sm)">
          Phone number
          <span className="absolute -bottom-2 -right-2 flex items-center gap-1 rounded-full bg-(--action-primary) px-2 py-0.5 bg-caption text-(--text-on-brand) shadow-(--shadow-sm) rotate-0">
            <MousePointer2 size={9} />
            Sarah is dragging
          </span>
        </div>
      </div>
    </div>
  );
}

function DashboardVisual() {
  const chips = [
    { label: "Responses", value: "8,412" },
    { label: "Completion", value: "64.2%" },
  ];
  const rows = [
    { label: "Completed", pct: 64, delta: "+4%", dir: "up" as const, color: "var(--primary-500)" },
    { label: "In progress", pct: 24, delta: "-1%", dir: "down" as const, color: "var(--primary-300)" },
    { label: "New", pct: 12, delta: "-3%", dir: "down" as const, color: "var(--primary-100)" },
  ];
  return (
    <div className="rounded-(--bg-radius-sm) border border-(--border-default) bg-(--surface-hover) p-3 h-full">
      <div className="grid grid-cols-2 gap-1.5 mb-3">
        {chips.map((c) => (
          <div key={c.label} className="rounded-(--bg-radius-sm) bg-(--surface-card) border border-(--border-default) px-2 py-1.5">
            <div className="bg-caption text-(--text-muted)">{c.label}</div>
            <div className="bg-body-sm font-bold text-(--text-primary) tabular-nums">{c.value}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <svg viewBox="0 0 42 42" className="w-14 h-14 shrink-0" aria-hidden="true">
          <circle cx="21" cy="21" r="15.9" fill="transparent" stroke="var(--border-default)" strokeWidth="6" />
          <circle cx="21" cy="21" r="15.9" fill="transparent" stroke="var(--primary-500)" strokeWidth="6" strokeDasharray="64 100" strokeDashoffset="25" transform="rotate(-90 21 21)" />
        </svg>
        <div className="flex-1 space-y-1">
          {rows.map((r) => {
            const DeltaIcon = r.dir === "up" ? ArrowUp : ArrowDown;
            return (
              <div key={r.label} className="flex items-center gap-1.5 bg-caption text-(--text-secondary)">
                <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                <span className="flex-1 truncate">{r.label}</span>
                <span className="tabular-nums font-medium">{r.pct}%</span>
                <span
                  className="inline-flex items-center gap-0.5 tabular-nums"
                  style={{ color: r.dir === "up" ? "var(--success)" : "var(--error)" }}
                >
                  <DeltaIcon size={9} />
                  {r.delta}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function KanbanVisual() {
  const columns: { title: string; cards: { personId: PersonId; tag?: string }[] }[] = [
    { title: "New", cards: [{ personId: "amelia", tag: "VIP" }] },
    { title: "In progress", cards: [{ personId: "marcus", tag: "Follow up" }, { personId: "tom", tag: "VIP" }] },
    { title: "Completed", cards: [{ personId: "priya" }, { personId: "kelly" }] },
  ];
  const dragging = personById("chidi");
  return (
    <div className="relative rounded-(--bg-radius-sm) border border-(--border-default) bg-(--surface-hover) p-3 h-full">
      <div className="grid grid-cols-3 gap-2">
        {columns.map((col) => (
          <div key={col.title}>
            <div className="bg-caption font-semibold uppercase tracking-wide text-(--text-muted) mb-1.5">{col.title}</div>
            <div className="space-y-1.5">
              {col.cards.map((card) => {
                const person = personById(card.personId);
                return (
                  <div key={card.personId} className="rounded-(--bg-radius-sm) border border-(--border-default) bg-(--surface-card) px-1.5 py-1.5">
                    <div className="flex items-center gap-1.5">
                      <Avatar name={person.name} src={person.src} alt="" size="xs" className="!h-4 !w-4" />
                      <span className="bg-caption text-(--text-primary) truncate">{person.name}</span>
                    </div>
                    {card.tag && <span className="mt-1 inline-block text-[8px] text-(--text-link) font-medium">{card.tag}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="absolute top-[38%] left-[30%] rounded-(--bg-radius-sm) border border-(--border-focus) bg-(--surface-card) px-1.5 py-1.5 shadow-(--shadow-md) rotate-3 w-[30%]">
        <div className="flex items-center gap-1.5">
          <Avatar name={dragging.name} src={dragging.src} alt="" size="xs" className="!h-4 !w-4" />
          <span className="bg-caption text-(--text-primary) truncate">{dragging.name}</span>
        </div>
      </div>
    </div>
  );
}

function ExportVisual() {
  const queue = [
    { name: "responses-aug.csv", format: "CSV", status: "ready" as const },
    { name: "summary-q3.pdf", format: "PDF", status: "progress" as const },
    { name: "responses-sep.csv", format: "CSV", status: "queued" as const },
  ];
  return (
    <div className="rounded-(--bg-radius-sm) border border-(--border-default) bg-(--surface-hover) p-3 h-full space-y-3">
      <svg viewBox="0 0 100 34" className="w-full h-9" preserveAspectRatio="none" aria-hidden="true">
        <polyline points="0,30 20,24 40,26 60,14 80,8 100,2" fill="none" stroke="var(--primary-500)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="space-y-1.5">
        {queue.map((q) => (
          <div key={q.name} className="flex items-center gap-2 rounded-(--bg-radius-sm) bg-(--surface-card) border border-(--border-default) px-2 py-1.5">
            <FileText size={12} className="text-(--text-muted) shrink-0" />
            <span className="flex-1 bg-caption text-(--text-secondary) truncate">{q.name}</span>
            <span className="rounded-full bg-(--accent-soft) px-1.5 py-0.5 text-[8px] font-semibold text-(--accent-soft-text) shrink-0">{q.format}</span>
            {q.status === "ready" && <Download size={12} className="text-(--success) shrink-0" />}
            {q.status === "progress" && <Loader2 size={12} className="text-(--action-primary) shrink-0 animate-spin" />}
            {q.status === "queued" && <Clock size={12} className="text-(--text-muted) shrink-0" />}
          </div>
        ))}
      </div>
    </div>
  );
}

const FEATURES = [
  { visual: BuilderVisual, title: "Build it by dragging", body: "Ten field types, conditional logic, and your own branding. No code, no template to fight with. Publish to a link, an embed or a QR code in one click.", span: "lg:col-span-7" },
  { visual: DashboardVisual, title: "A dashboard that builds itself", body: "The first submission generates it. Response trends, status breakdown, per-question charts — no configuration, no setup screen.", span: "lg:col-span-5" },
  { visual: KanbanVisual, title: "Responses you can actually work", body: "Assign to a teammate, tag it, move it through your own stages, and leave internal notes the respondent never sees.", span: "lg:col-span-5" },
  { visual: ExportVisual, title: "Get the data out", body: "Stream to CSV or generate a PDF summary. Exports respect whatever filter you are looking at, so you get the rows you meant.", span: "lg:col-span-7" },
];

function FeatureCard({ index, feature }: { index: number; feature: (typeof FEATURES)[number] }) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  const Visual = feature.visual;
  return (
    <div
      ref={ref}
      className={`reveal-up ${visible ? "is-visible" : ""} lift col-span-12 ${feature.span} rounded-(--bg-radius-md) border border-(--border-default) bg-(--surface-card) p-5 flex flex-col`}
      style={{ "--reveal-delay": `${index * 80}ms` } as React.CSSProperties}
    >
      <div className="h-[190px]">
        <Visual />
      </div>
      <h3 className="bg-h5 text-(--text-primary) mt-4 mb-2">{feature.title}</h3>
      <p className="bg-body-sm text-(--text-secondary)">{feature.body}</p>
    </div>
  );
}

export default function FeaturesSection() {
  const { ref: headingRef, visible: headingVisible } = useReveal<HTMLDivElement>();

  return (
    <section id="features" className="py-14 md:py-[72px] lg:py-24 bg-(--bg-subtle) border-t border-(--border-default)">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          ref={headingRef}
          className={`reveal ${headingVisible ? "is-visible" : ""} text-center mb-8 md:mb-12 max-w-3xl mx-auto`}
        >
          <div className="bg-overline text-(--text-link) mb-3">Features</div>
          <h2 className="bg-h2 text-(--text-primary) mb-4">Everything after the submit button</h2>
          <p className="bg-body-lg text-(--text-secondary)">
            Most form tools stop at collection. Beginso picks up where they leave off.
          </p>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {FEATURES.map((feature, index) => (
            <FeatureCard key={feature.title} index={index} feature={feature} />
          ))}
        </div>
      </div>
    </section>
  );
}
