"use client";

import { useEffect, useState } from "react";
import { useScrollProgress } from "@/hooks/useScrollProgress";
import { Avatar } from "@/components/ui/Avatar";
import { Wordmark } from "./Wordmark";
import { personById, type PersonId } from "./data/people";
import { Tag } from "@/components/ui/Tag";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Home,
  FileText,
  Inbox as InboxIcon,
  BarChart3,
  Users,
  Trash2,
  Settings,
  Building2,
  Search,
  Bell,
  ChevronRight,
  Download,
  Share2,
  ArrowUp,
  ArrowDown,
  Minus,
  Paperclip,
  MessageSquare,
  CheckCircle2,
} from "lucide-react";

const NAV_ITEMS = [
  { icon: Home, label: "Home" },
  { icon: FileText, label: "Forms" },
  { icon: InboxIcon, label: "Inbox", badge: "14", active: true },
  { icon: BarChart3, label: "Insights" },
  { icon: Users, label: "Team" },
  { icon: Trash2, label: "Trash" },
  { icon: Settings, label: "Settings" },
];

type Direction = "up" | "down" | "flat";
const DELTA_ICON: Record<Direction, typeof ArrowUp> = { up: ArrowUp, down: ArrowDown, flat: Minus };
const DELTA_COLOR: Record<Direction, string> = {
  up: "var(--success)",
  down: "var(--error)",
  flat: "var(--text-muted)",
};

const STATS: { label: string; value: string; delta: string; dir: Direction }[] = [
  { label: "Responses", value: "8,412", delta: "+12.4%", dir: "up" },
  { label: "Completion", value: "64.2%", delta: "-3.1%", dir: "down" },
  { label: "Active forms", value: "17", delta: "No change", dir: "flat" },
  { label: "Avg. time", value: "2m 14s", delta: "+18s", dir: "flat" },
];

type InboxStatus = "new" | "in_progress" | "completed";
const STATUS_LABEL: Record<InboxStatus, string> = { new: "New", in_progress: "In progress", completed: "Completed" };

interface Row {
  personId: PersonId;
  email: string;
  tags: string[];
  assigneeId?: PersonId;
  status: InboxStatus;
  date: string;
  unread?: boolean;
  noteCount?: number;
  attachment?: number;
}

const TABLE_ROWS: Row[] = [
  { personId: "amelia", email: "amelia@northwind.co", tags: ["VIP", "Follow up"], assigneeId: "sarah", status: "new", date: "Sep 2", unread: true },
  { personId: "marcus", email: "marcus@cascade.io", tags: ["Follow up"], assigneeId: "alex", status: "in_progress", date: "Sep 1", noteCount: 3 },
  { personId: "priya", email: "priya@verity.com", tags: [], status: "completed", date: "Aug 31" },
  { personId: "tom", email: "tom@loopco.com", tags: ["VIP"], assigneeId: "sarah", status: "in_progress", date: "Aug 31", attachment: 2 },
  { personId: "chidi", email: "chidi@anchorpt.io", tags: ["Follow up"], assigneeId: "alex", status: "new", date: "Aug 30" },
  { personId: "kelly", email: "kelly@fieldstone.co", tags: [], assigneeId: "sarah", status: "completed", date: "Aug 29" },
  { personId: "noah", email: "noah@harbor.io", tags: ["VIP", "Follow up"], status: "new", date: "Aug 29" },
  { personId: "lena", email: "lena@greywing.com", tags: ["Follow up"], assigneeId: "alex", status: "in_progress", date: "Aug 28" },
];

const AREA_POINTS = "0,52 27,48 55,50 82,40 109,42 136,32 164,34 191,24 218,26 245,14 273,16 300,4";
const STATUS_LEGEND = [
  { label: "Completed", pct: "64%", color: "var(--primary-500)" },
  { label: "In progress", pct: "24%", color: "var(--primary-300)" },
  { label: "New", pct: "12%", color: "var(--primary-100)" },
];
const ACTIVITY: { personId: PersonId; text: string; time: string }[] = [
  { personId: "marcus", text: "assigned a response to Kelly Park", time: "2m ago" },
  { personId: "priya", text: "marked a response as completed", time: "18m ago" },
  { personId: "amelia", text: "left a note on Tom Becker's response", time: "1h ago" },
];

// All positive: a negative translateZ here renders behind the card's own
// opaque body (they share one preserve-3d context) and gets swallowed.
// Depth still differs, so they drift at different rates as the card settles.
const FLOATING_ICONS = [
  { Icon: FileText, z: 60, className: "-top-5 -left-5" },
  { Icon: BarChart3, z: 44, className: "-bottom-5 -left-5" },
  { Icon: CheckCircle2, z: 28, className: "-top-5 -right-5" },
  { Icon: InboxIcon, z: 12, className: "-bottom-5 -right-5" },
];

function useTiltStartDeg() {
  const [deg, setDeg] = useState(0);
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w >= 1024) setDeg(24);
      else if (w >= 768) setDeg(12);
      else setDeg(0);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return deg;
}

function Delta({ delta, dir }: { delta: string; dir: Direction }) {
  const Icon = DELTA_ICON[dir];
  return (
    <span className="inline-flex items-center gap-1 bg-caption font-semibold" style={{ color: DELTA_COLOR[dir] }}>
      <Icon size={11} />
      {delta}
    </span>
  );
}

function StatCards({ compact }: { compact?: boolean }) {
  return (
    <div className={`grid grid-cols-2 ${compact ? "" : "lg:grid-cols-4"} gap-3`}>
      {STATS.map((s) => (
        <div key={s.label} className="rounded-(--bg-radius-sm) border border-(--border-default) bg-(--surface-hover) px-3 py-2.5">
          <div className="bg-caption text-(--text-muted) mb-1">{s.label}</div>
          <div className="text-[20px] font-bold text-(--text-primary) tabular-nums leading-none mb-1.5">{s.value}</div>
          <Delta delta={s.delta} dir={s.dir} />
        </div>
      ))}
    </div>
  );
}

function TableRow({ row }: { row: Row }) {
  const person = personById(row.personId);
  const assignee = row.assigneeId ? personById(row.assigneeId) : undefined;
  return (
    <div className="grid grid-cols-[20px_1.6fr_1.1fr_28px_100px_60px] items-center gap-3 px-3 py-2.5 border-b border-(--border-default) last:border-b-0">
      <span className="h-3.5 w-3.5 rounded-[3px] border border-(--border-strong) shrink-0" />
      <div className="flex items-center gap-2 min-w-0">
        <span className="relative shrink-0">
          <Avatar name={person.name} src={person.src} alt="" size="xs" />
          {row.unread && <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-(--action-primary)" />}
        </span>
        <div className="min-w-0">
          <div className={`bg-body-sm truncate ${row.unread ? "font-bold text-(--text-primary)" : "font-medium text-(--text-primary)"}`}>
            {person.name}
          </div>
          <div className="bg-caption text-(--text-muted) truncate">{row.email}</div>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-wrap min-w-0">
        {row.tags.map((t) => (
          <Tag key={t} className="bg-caption leading-none px-1.5 py-0.5">{t}</Tag>
        ))}
        {row.noteCount && (
          <span className="inline-flex items-center gap-0.5 bg-caption text-(--text-muted)">
            <MessageSquare size={10} />
            {row.noteCount}
          </span>
        )}
        {row.attachment && (
          <span className="inline-flex items-center gap-0.5 bg-caption text-(--text-muted)">
            <Paperclip size={10} />
            {row.attachment}
          </span>
        )}
      </div>
      {assignee ? (
        <Avatar name={assignee.name} src={assignee.src} alt="" size="xs" />
      ) : (
        <span className="h-5 w-5 rounded-full border border-dashed border-(--border-strong)" aria-hidden="true" />
      )}
      <StatusBadge variant={row.status} className="bg-caption px-1.5 py-0 leading-none w-fit">
        {STATUS_LABEL[row.status]}
      </StatusBadge>
      <span className="bg-caption text-(--text-muted) text-right">{row.date}</span>
    </div>
  );
}

function InboxTable({ rows }: { rows: Row[] }) {
  return (
    <div className="rounded-(--bg-radius-sm) border border-(--border-default) overflow-hidden">
      <div className="grid grid-cols-[20px_1.6fr_1.1fr_28px_100px_60px] items-center gap-3 px-3 py-2 bg-(--surface-hover) bg-caption font-semibold uppercase tracking-wide text-(--text-muted)">
        <span />
        <span>Respondent</span>
        <span>Tags</span>
        <span>Assignee</span>
        <span>Status</span>
        <span className="text-right">Submitted</span>
      </div>
      {rows.map((row) => (
        <TableRow key={row.personId} row={row} />
      ))}
    </div>
  );
}

function AreaChart() {
  return (
    <div className="rounded-(--bg-radius-sm) border border-(--border-default) p-3">
      <div className="bg-caption font-semibold text-(--text-secondary) mb-2">Responses over time</div>
      <svg viewBox="0 0 300 60" className="w-full h-16" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="mockup-area-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary-500)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--primary-500)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={`${AREA_POINTS} 300,60 0,60`} fill="url(#mockup-area-fill)" />
        <polyline points={AREA_POINTS} fill="none" stroke="var(--primary-500)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="300" cy="4" r="3" fill="var(--primary-500)" />
      </svg>
      <div className="flex justify-between bg-caption text-(--text-muted) mt-1">
        <span>Jan</span>
        <span>Jun</span>
        <span>Dec</span>
      </div>
    </div>
  );
}

function StatusDonut() {
  return (
    <div className="rounded-(--bg-radius-sm) border border-(--border-default) p-3 flex items-center gap-4">
      <div className="relative shrink-0">
        <svg viewBox="0 0 42 42" className="w-16 h-16" aria-hidden="true">
          <circle cx="21" cy="21" r="15.9" fill="transparent" stroke="var(--border-default)" strokeWidth="6" />
          <circle cx="21" cy="21" r="15.9" fill="transparent" stroke="var(--primary-500)" strokeWidth="6" strokeDasharray="64 100" strokeDashoffset="25" transform="rotate(-90 21 21)" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center bg-caption font-bold text-(--text-primary)">64%</span>
      </div>
      <div className="flex-1 space-y-1.5">
        <div className="bg-caption font-semibold text-(--text-secondary) mb-1">By status</div>
        {STATUS_LEGEND.map((r) => (
          <div key={r.label} className="flex items-center gap-1.5 bg-caption text-(--text-secondary)">
            <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
            <span className="flex-1">{r.label}</span>
            <span className="tabular-nums font-medium">{r.pct}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentActivity() {
  return (
    <div className="rounded-(--bg-radius-sm) border border-(--border-default) p-3">
      <div className="bg-caption font-semibold text-(--text-secondary) mb-2">Recent activity</div>
      <div className="space-y-2.5">
        {ACTIVITY.map((a) => {
          const person = personById(a.personId);
          return (
            <div key={a.personId + a.time} className="flex items-start gap-2">
              <Avatar name={person.name} src={person.src} alt="" size="xs" />
              <div className="min-w-0 flex-1">
                <div className="bg-caption text-(--text-secondary) leading-snug">
                  <span className="font-semibold text-(--text-primary)">{person.name}</span> {a.text}
                </div>
                <div className="bg-caption text-(--text-muted)">{a.time}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const ALEX = personById("alex");

export default function ProductMockup() {
  const { ref, progress } = useScrollProgress<HTMLDivElement>();
  const startDeg = useTiltStartDeg();

  const rotate = startDeg - progress * startDeg;
  const lift = startDeg > 0 ? 40 - progress * 40 : 0;
  const scale = 0.94 + progress * 0.06;
  const transform = startDeg > 0 ? `rotateX(${rotate}deg) translateY(${lift}px) scale(${scale})` : "none";

  return (
    <div ref={ref} className="tilt-stage w-full flex justify-center">
      <div className="tilt-card relative w-full max-w-[1180px]" style={{ transform }}>
      <div className="rounded-(--bg-radius-md) border border-(--border-default) bg-(--surface-card) shadow-(--shadow-lg) overflow-hidden">
        {/* Browser chrome */}
        <div className="h-9 flex items-center gap-3 px-3 border-b border-(--border-default) bg-(--surface-hover)">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ED6A5E]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#F4BF4F]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#61C554]" />
          </div>
          <div className="flex-1 flex justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-(--surface-card) border border-(--border-default) px-3 py-1 bg-caption text-(--text-muted)">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://storage.beginso.com/assets/logo-light.svg" alt="" height={12} width={12} style={{ height: 12, width: 12 }} aria-hidden="true" className="brand-icon-light" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://storage.beginso.com/assets/logo-dark.svg" alt="" height={12} width={12} style={{ height: 12, width: 12 }} aria-hidden="true" className="brand-icon-dark" />
              beginso.com/w/acme/inbox
            </span>
          </div>
          <Avatar name={ALEX.name} src={ALEX.src} alt="" size="xs" />
        </div>

        {/* App top bar */}
        <div className="hidden md:flex h-14 items-center gap-4 px-4 border-b border-(--border-default)">
          <span className="flex items-center gap-2 shrink-0">
            <Wordmark height={40} />
          </span>
          <div className="flex-1 max-w-sm flex items-center gap-2 rounded-(--bg-radius-sm) border border-(--border-default) bg-(--surface-hover) px-3 py-1.5">
            <Search size={13} className="text-(--text-muted) shrink-0" />
            <span className="bg-caption text-(--text-muted) truncate">Search forms, responses, people</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="relative">
              <Bell size={16} className="text-(--text-muted)" />
              <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-(--error)" />
            </span>
            <Avatar name={ALEX.name} src={ALEX.src} alt="" size="sm" />
          </div>
        </div>

        <div className="flex">
          {/* Left sidebar */}
          <nav className="hidden lg:flex w-55 shrink-0 flex-col border-r border-(--border-default) p-3">
            <div className="flex items-center gap-2 rounded-(--bg-radius-sm) px-2 py-2 mb-3 bg-(--surface-hover)">
              <Building2 size={16} className="text-(--text-secondary) shrink-0" />
              <div className="min-w-0">
                <div className="bg-body-sm font-semibold text-(--text-primary) truncate">Acme Corp</div>
                <div className="bg-caption text-(--text-muted)">Owner</div>
              </div>
            </div>

            <div className="flex-1 space-y-0.5">
              {NAV_ITEMS.map(({ icon: Icon, label, badge, active }) => (
                <div
                  key={label}
                  className={`flex items-center gap-2 rounded-(--bg-radius-sm) px-2 py-1.5 bg-body-sm ${
                    active ? "bg-(--accent-soft) text-(--accent-soft-text) font-semibold" : "text-(--text-secondary)"
                  }`}
                >
                  <Icon size={14} className={`shrink-0 ${active ? "text-(--text-link)" : ""}`} />
                  <span className="flex-1 truncate">{label}</span>
                  {badge && <span className="bg-caption font-semibold text-(--text-link)">{badge}</span>}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 rounded-(--bg-radius-sm) px-2 py-2 border-t border-(--border-default) pt-3">
              <Avatar name={ALEX.name} src={ALEX.src} alt="" size="xs" />
              <div className="min-w-0">
                <div className="bg-caption font-medium text-(--text-primary) truncate">Alex Rivera</div>
                <div className="bg-caption text-(--text-muted)">Account</div>
              </div>
            </div>
          </nav>

          {/* Main area */}
          <div className="flex-1 min-w-0 p-4 space-y-4">
            {/* Page header */}
            <div className="hidden md:flex items-center gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1 bg-caption text-(--text-muted) mb-1">
                  <span>Acme Corp</span>
                  <ChevronRight size={10} />
                  <span className="truncate">Customer feedback survey</span>
                </div>
                <div className="flex items-center gap-2">
                  <h3 className="text-[16px] font-bold text-(--text-primary)">Inbox</h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-(--success-surface) px-2 py-0.5 bg-caption font-semibold text-(--success-text)">
                    <span className="h-1.5 w-1.5 rounded-full bg-(--success)" />
                    Live
                  </span>
                </div>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-(--bg-radius-sm) border border-(--border-default) px-2.5 py-1.5 bg-caption font-medium text-(--text-secondary)">
                  <Download size={12} />
                  Export
                </span>
                <span className="inline-flex items-center gap-1 rounded-(--bg-radius-sm) bg-(--action-primary) px-2.5 py-1.5 bg-caption font-medium text-(--text-on-brand)">
                  <Share2 size={12} />
                  Share
                </span>
              </div>
            </div>

            <StatCards />

            {/* Full composition (>=1280) and mid composition (1024-1279, table only) */}
            <div className="hidden md:grid grid-cols-1 xl:grid-cols-[62fr_38fr] gap-4">
              <InboxTable rows={TABLE_ROWS} />

              <div className="hidden xl:flex flex-col gap-3">
                <AreaChart />
                <StatusDonut />
                <RecentActivity />
              </div>
            </div>

            <div className="hidden md:flex items-center justify-between bg-caption text-(--text-muted)">
              <span>Showing 1-8 of 384</span>
              <div className="flex items-center gap-1">
                <span className="rounded-(--bg-radius-sm) border border-(--border-default) px-2 py-1">Prev</span>
                <span className="rounded-(--bg-radius-sm) border border-(--border-default) px-2 py-1">Next</span>
              </div>
            </div>

            {/* Reduced composition below 768: top bar + stats + 4 rows only */}
            <div className="md:hidden">
              <InboxTable rows={TABLE_ROWS.slice(0, 4)} />
            </div>
          </div>
        </div>
      </div>

        {FLOATING_ICONS.map(({ Icon, z, className }, i) => (
          <div
            key={i}
            aria-hidden="true"
            className={`hidden md:flex absolute h-12 w-12 items-center justify-center rounded-(--bg-radius-md) border border-(--border-default) bg-(--surface-card) shadow-(--shadow-md) ${className}`}
            style={{ transform: `translateZ(${z}px)` }}
          >
            <Icon size={20} className="text-(--action-primary)" />
          </div>
        ))}
      </div>
    </div>
  );
}
