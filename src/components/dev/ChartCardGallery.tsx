"use client";

// Dev gallery for the chart-card components in components/ui/charts — rendered with the real
// components on sample data (non-production only, see app/dev/ui/charts). Doubles as their docs.
import { useState, type ReactNode } from "react";
import { Calendar, FileText, MessageSquare, Database, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import {
  BarChart,
  CHART_COLOR,
  ChartCard,
  ComboChart,
  DonutWithLegend,
  LegendDots,
  LineChart,
  ProgressBars,
  Ring,
  RingSet,
} from "@/components/ui/charts";
import { bx } from "@/lib/utils";

const SERIES = [8, 12, 9, 15, 13, 20, 17, 24, 22, 30];
const SERIES_B = [5, 7, 9, 8, 12, 11, 15, 14, 18, 17];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEK = [24, 30, 42, 44, 62, 46, 32];
const WEEK_DATA = DAYS.map((label, i) => ({ label, value: WEEK[i] }));
const TREND = [14, 20, 26, 32, 47, 52, 64].map((value, i) => ({ label: DAYS[i], value }));
const STATUS = [
  { label: "Published", value: 2, color: CHART_COLOR.primary },
  { label: "Draft", value: 3, color: CHART_COLOR.soft },
  { label: "Closed", value: 2, color: CHART_COLOR.warning },
];

function Tagged({ n, name, children }: { n: number; name: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="bg-body-sm font-semibold text-(--text-secondary)"><span className="text-(--text-link)">{n}</span> · {name}</span>
      {children}
    </div>
  );
}

function Group({ title, note, cols, children }: { title: string; note: string; cols: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div><h2 className="bg-h4 text-(--text-primary)">{title}</h2><p className="bg-body-sm text-(--text-muted)">{note}</p></div>
      <div className={bx("grid gap-4", cols)}>{children}</div>
    </section>
  );
}

export function ChartCardGallery() {
  const [dark, setDark] = useState(false);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    if (next) document.documentElement.setAttribute("data-theme", "dark");
    else document.documentElement.removeAttribute("data-theme");
  };
  return (
    <div className="mx-auto flex max-w-350 flex-col gap-10 p-8 bg-(--bg-page)">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="bg-h2 text-(--text-primary)">Chart cards — the real components</h1>
          <p className="bg-body text-(--text-muted)">
            Everything below is a StatCard with a chart prop, or a component from components/ui/charts, on sample data.
          </p>
        </div>
        <Button variant="secondary" onClick={toggle}>{dark ? "Light" : "Dark"} theme</Button>
      </header>

      <Group title="StatCard with a chart" note="StatCard chart={{ kind: … }} — bare icon + number left, chart right." cols="sm:grid-cols-2 lg:grid-cols-3">
        <Tagged n={1} name="bars"><StatCard label="Responses" value={114} icon={<MessageSquare />} chart={{ kind: "bars", values: [3, 5, 4, 8, 6, 11, 10, 15] }} /></Tagged>
        <Tagged n={2} name="progress"><StatCard label="Published" value={2} unit="/ 4" icon={<FileText />} chart={{ kind: "progress", percent: 50 }} /></Tagged>
        <Tagged n={3} name="Ring on its own">
          <Card className="items-center justify-center">
            <Ring percent={78} size={116} stroke={9}>
              <span className="text-[24px] font-bold leading-7 text-(--text-primary)">78%</span>
              <span className="bg-caption text-(--text-muted)">Completion</span>
            </Ring>
          </Card>
        </Tagged>
        <Tagged n={4} name="line"><StatCard label="This month" value={50} icon={<Calendar />} chart={{ kind: "line", values: SERIES }} /></Tagged>
        <Tagged n={5} name="dual"><StatCard label="Total Responses" value={114} icon={<TrendingUp />} chart={{ kind: "dual", values: [4, 7, 5, 10, 8], part: [3, 5, 4, 7, 6] }} /></Tagged>
        <Tagged n={6} name="line, no area (sparkline)"><StatCard label="Total Forms" value={4} icon={<FileText />} chart={{ kind: "line", values: [3, 4, 3, 5, 4, 6, 5, 7, 8, 9], area: false }} /></Tagged>
        <Tagged n={7} name="line (area)"><StatCard label="Responses" value={114} icon={<MessageSquare />} chart={{ kind: "line", values: [2, 4, 3, 7, 6, 11, 9, 14, 18, 22] }} /></Tagged>
        <Tagged n={8} name="stacked"><StatCard label="This month" value={50} icon={<Database />} chart={{ kind: "stacked", columns: [[3, 2, 1], [4, 3, 2], [5, 3, 2], [6, 5, 3], [7, 5, 4]] }} /></Tagged>
        <Tagged n={9} name="DonutWithLegend"><Card><DonutWithLegend segments={STATUS} size={104} /></Card></Tagged>
        <Tagged n={10} name="multi"><StatCard label="Responses" value={114} icon={<TrendingUp />} chart={{ kind: "multi", values: SERIES, secondary: SERIES_B }} /></Tagged>
        <Tagged n={11} name="columns"><StatCard label="This month" value={50} icon={<Calendar />} chart={{ kind: "columns", values: [4, 6, 5, 11, 3, 4, 5], labels: DAYS }} /></Tagged>
        <Tagged n={12} name="RingSet"><Card><RingSet rings={[{ percent: 25 }, { percent: 50, color: CHART_COLOR.success }, { percent: 75, color: CHART_COLOR.warning }, { percent: 100 }]} /></Card></Tagged>
      </Group>

      <Group title="Chart cards" note="ChartCard title around BarChart / LineChart / ComboChart / DonutWithLegend / ProgressBars. Measured width, real-pixel axes." cols="lg:grid-cols-2">
        <Tagged n={13} name="BarChart"><ChartCard title="Responses this week"><BarChart data={WEEK_DATA} ariaLabel="Responses this week" /></ChartCard></Tagged>
        <Tagged n={14} name="LineChart"><ChartCard title="Response trend"><LineChart data={TREND} ariaLabel="Response trend" /></ChartCard></Tagged>
        <Tagged n={15} name="DonutWithLegend"><ChartCard title="Forms by status"><DonutWithLegend segments={STATUS} size={150} /></ChartCard></Tagged>
        <Tagged n={16} name="ProgressBars"><ChartCard title="Forms by status"><ProgressBars items={STATUS.map((s) => ({ label: s.label, value: s.value, color: s.color }))} /></ChartCard></Tagged>
        <Tagged n={17} name="ComboChart">
          <ChartCard title="Responses & Forms" legend={<LegendDots items={[{ label: "Responses", color: CHART_COLOR.primary }, { label: "Forms", color: CHART_COLOR.success }]} />}>
            <ComboChart data={WEEK_DATA} line={[28, 36, 30, 44, 38, 48, 42]} ariaLabel="Responses and forms by day" />
          </ChartCard>
        </Tagged>
        <Tagged n={18} name="BarChart, 30 days (labels thin out)">
          <ChartCard title="Daily submissions">
            <BarChart data={Array.from({ length: 30 }, (_, i) => ({ label: String((i % 28) + 1).padStart(2, "0"), value: ((i * 7) % 19) + 2 }))} ariaLabel="Daily submissions" />
          </ChartCard>
        </Tagged>
      </Group>
    </div>
  );
}
