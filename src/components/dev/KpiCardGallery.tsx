"use client";

// Dev gallery of the 20 KPI-card looks — the real ui/KpiCard on sample data (non-production only, app/dev/ui/kpi).
import { useState } from "react";
import { Calendar, FileText, MessageSquare, BarChart3, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { KpiCard, type KpiData, type KpiVariant } from "@/components/ui/KpiCard";

const TREND = [4, 6, 5, 8, 7, 11, 9, 14, 13, 18];
const WAVE = [6, 5, 8, 6, 9, 8, 12, 10, 14, 16];
const resp = (extra: Partial<KpiData> = {}): KpiData => ({
  label: "Total responses",
  value: "1,284",
  icon: <FileText />,
  delta: { value: "12.5%", note: "vs last 30 days" },
  trend: TREND,
  ...extra,
});

const CARDS: { name: string; variant: KpiVariant; data: KpiData }[] = [
  { name: "Minimal (Clean)", variant: 1, data: resp() },
  { name: "Solid (Brand)", variant: 2, data: resp({ icon: <MessageSquare /> }) },
  { name: "With Chart (Bars)", variant: 3, data: resp({ icon: <BarChart3 />, trend: [3, 5, 6, 8, 11, 15] }) },
  { name: "Progress (x of y)", variant: 4, data: resp({ percent: 64, sub: "1,284 of 2,000" }) },
  { name: "Ring with label", variant: 5, data: { label: "Completion rate", value: "86%", percent: 86, status: { label: "Healthy", tone: "success" }, sub: "of people who open a form finish it" } },
  { name: "Ring with attention", variant: 6, data: { label: "Completion rate", value: "41%", percent: 41, status: { label: "Needs attention", tone: "warning" }, sub: "of people who open a form finish it" } },
  { name: "Icon + Delta", variant: 7, data: resp({ icon: <Users />, tone: "error", delta: { value: "8%", down: true, note: "vs last 30 days" } }) },
  { name: "Two columns", variant: 8, data: resp({ secondary: { label: "Avg. per form", value: "3.2", delta: { value: "28%" } } }) },
  { name: "Compact + bars", variant: 9, data: { label: "This month", value: 342, delta: { value: "8%", down: true }, trend: [3, 5, 7, 9, 12, 17] } },
  { name: "Area chart", variant: 10, data: resp({ trend: WAVE }) },
  { name: "Icon badge", variant: 11, data: resp({ period: "Last 30 days" }) },
  { name: "Split with trend", variant: 12, data: resp({ trend: WAVE, highlight: "Higher than usual" }) },
  { name: "Vertical (Label below)", variant: 13, data: resp({ icon: <MessageSquare />, tone: "purple" }) },
  { name: "Status + progress", variant: 14, data: { label: "Active forms", value: 4, sub: "/ 20", percent: 20, icon: <FileText /> } },
  { name: "With comparison", variant: 15, data: resp({ delta: { value: "24%" }, sub: "vs 1,038 last period", trend: [4, 6, 5, 9, 12] }) },
  { name: "Mini donut with value", variant: 16, data: resp({ percent: 72 }) },
  { name: "Gradient background", variant: 17, data: resp() },
  { name: "With secondary metric", variant: 18, data: resp({ secondary: { label: "Avg. per form", value: "3.2", delta: { value: "28%" } } }) },
  {
    name: "Multi-metric", variant: 19,
    data: { label: "", value: "", items: [
      { label: "Responses", value: "1,284", icon: <FileText />, tone: "primary" },
      { label: "Active forms", value: 4, icon: <Calendar />, tone: "warning" },
      { label: "Members", value: 6, icon: <Users />, tone: "purple" },
    ] },
  },
  { name: "With icon list", variant: 20, data: resp({ icon: <MessageSquare />, delta: { value: "12.5%" }, highlight: "Higher than last month" }) },
];

export function KpiCardGallery() {
  const [dark, setDark] = useState(false);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    if (next) document.documentElement.setAttribute("data-theme", "dark");
    else document.documentElement.removeAttribute("data-theme");
  };
  return (
    <div className="mx-auto flex max-w-350 flex-col gap-8 bg-(--bg-page) p-4 sm:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="bg-h2 text-(--text-primary)">KPI cards — 20 designs</h1>
          <p className="bg-body text-(--text-muted)">The real components/ui/KpiCard on sample data.</p>
        </div>
        <Button variant="secondary" onClick={toggle}>{dark ? "Light" : "Dark"} theme</Button>
      </header>
      <div className="grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2 xl:grid-cols-4">
        {CARDS.map((c, i) => (
          <div key={c.name} className="flex min-w-0 flex-col gap-2.5">
            <span className="bg-body-sm font-semibold text-(--text-primary)">
              <span className="mr-1.5 tabular-nums text-(--text-muted)">{String(i + 1).padStart(2, "0")}.</span>
              {c.name}
            </span>
            <div className="flex-1"><KpiCard variant={c.variant} data={c.data} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}
