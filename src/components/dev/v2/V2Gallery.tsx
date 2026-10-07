"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle, ArrowDownToLine, BadgeCheck, CheckCircle2, ChevronRight, Clock, Inbox, LayoutTemplate,
  MessageSquare, MoreVertical, Palette, Plus, Share2, Trash2, UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import s from "./v2.module.css";

const cx = (...a: (string | false | undefined)[]) => a.filter(Boolean).join(" ");

/* A believable account. Days run oldest to newest; the last one is today. */
const DAILY = [3, 5, 2, 8, 6, 4, 9, 12, 7, 5, 11, 14, 9, 16];
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const FORMS = [
  { title: "Event registration", responses: 39, unread: 31, edited: "21 hours ago", status: "Live", color: "#3C69CC" },
  { title: "Job application", responses: 37, unread: 40 - 9, edited: "6 days ago", status: "Live", color: "#7A4CC2" },
  { title: "Customer feedback survey", responses: 1, unread: 0, edited: "6 Oct", status: "Live", color: "#0E8A74" },
  { title: "Pitch plan", responses: 0, unread: 0, edited: "26 Sep", status: "Draft", color: "#B9770E" },
];

const ACTIVITY = [
  { day: "Today", items: [
    { who: "Maya Wright", what: "sent a response to Job application", when: "12 min ago", color: "#7A4CC2" },
    { who: "Noah Miller", what: "sent a response to Event registration", when: "1 hour ago", color: "#3C69CC" },
    { who: "Priya Sharma", what: "published Customer feedback survey", when: "3 hours ago", color: "#0E8A74" },
  ] },
  { day: "Yesterday", items: [
    { who: "Chidi Okafor", what: "became an editor", when: "18:20", color: "#B9770E" },
  ] },
];

const MEMBERS = [
  { name: "Priya Sharma", role: "Owner", color: "#3C69CC" },
  { name: "Chidi Okafor", role: "Editor", color: "#B9770E" },
  { name: "Maya Wright", role: "Reviewer", color: "#7A4CC2" },
];

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className={s.section}>
      <div className={s.sectionHead}>
        <h2 className={s.headline}>{title}</h2>
        {note && <p className={cx(s.body, s.muted)} style={{ maxWidth: "46ch", textAlign: "right" }}>{note}</p>}
      </div>
      {children}
    </section>
  );
}

function Row({ f }: { f: (typeof FORMS)[number] }) {
  return (
    <a href="#form" className={cx(s.row, s.interactive)} onClick={(e) => e.preventDefault()} style={{ paddingLeft: 24 }}>
      <span className={s.edge} style={{ background: f.color }} aria-hidden="true" />
      <span className={s.grow}>
        <span className={cx(s.titleSm, s.ellipsis)} style={{ display: "block" }}>{f.title}</span>
        <span className={s.metaRow}>
          <span className={s.meta}><MessageSquare aria-hidden="true" />{f.responses === 0 ? "No responses" : `${f.responses} ${f.responses === 1 ? "response" : "responses"}`}</span>
          <span className={s.meta}><Clock aria-hidden="true" />Edited {f.edited}</span>
        </span>
      </span>
      <span className={cx(s.chip, f.status === "Live" ? s.chipOk : s.chipWarn)}><span className={s.dot} />{f.status}</span>
      <Button variant="ghost" className="bg-btn-icon" aria-label={`Actions for ${f.title}`} onClick={(e) => e.stopPropagation()}><MoreVertical className="bg-icon" aria-hidden="true" /></Button>
    </a>
  );
}

export function V2Gallery() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Dev page only: flip the document theme attribute so every Beginso token swaps; restore on leave.
  useEffect(() => {
    const el = document.documentElement;
    const prev = el.getAttribute("data-theme");
    el.setAttribute("data-theme", theme);
    return () => {
      if (prev === null) el.removeAttribute("data-theme");
      else el.setAttribute("data-theme", prev);
    };
  }, [theme]);

  const max = Math.max(...DAILY);
  const withUnread = FORMS.filter((f) => f.unread > 0);
  const quiet = FORMS.filter((f) => f.unread === 0);

  return (
    <div className={s.root}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 className={s.pageTitle}>Card prototype</h1>
          <p className={cx(s.body, s.secondary)} style={{ maxWidth: "60ch", marginTop: 6 }}>
            Material-style cards in Beginso colours and DM Sans. One card per screen carries the weight; the rest stay flat. Not connected to the real app.
          </p>
        </div>
        <div className={s.segmented} role="group" aria-label="Theme">
          {(["light", "dark"] as const).map((t) => (
            <button key={t} type="button" aria-pressed={theme === t} onClick={() => setTheme(t)}>{t === "light" ? "Light" : "Dark"}</button>
          ))}
        </div>
      </header>

      {/* ── Home: one hero, two supporting cards ─────────────────────────── */}
      <Section title="Workspace home" note="The hero says what needs doing. Charts only appear where they answer a question.">
        <div className={s.lead}>
          <div className={cx(s.card, s.hero)}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <p className={s.heroLine}>71 responses are waiting for you</p>
              <p className={cx(s.body, s.secondary)} style={{ maxWidth: "52ch" }}>
                Most came in on Event registration. The last two weeks were your busiest since you started.
              </p>
            </div>
            <div>
              <div className={s.bars} role="img" aria-label="Responses per day for the last 14 days. Busiest day was the last one, with 16.">
                {DAILY.map((v, i) => (
                  <div
                    key={i}
                    className={v === max ? s.peak : undefined}
                    title={`${DAY_LABELS[i]}: ${v} responses`}
                    style={{ height: `${(v / max) * 100}%`, animationDelay: `${i * 30}ms` }}
                  />
                ))}
              </div>
              <div className={s.axis}><span>14 days ago</span><span>Today: 16 responses</span></div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Button variant="primary"><Inbox size={16} className="mr-2" aria-hidden="true" />Open inbox</Button>
              <Button variant="ghost">Mark all as read</Button>
            </div>
          </div>

          <div className={s.stackCol}>
            <div className={cx(s.card, s.outlined)}>
              <h3 className={s.title}>How people finish</h3>
              <div className={s.stack} role="img" aria-label="83 percent finished, 11 percent stopped partway, 6 percent never started">
                <span style={{ flex: 83, background: "var(--action-primary)" }} />
                <span style={{ flex: 11, background: "var(--warning)" }} />
                <span style={{ flex: 6, background: "var(--text-muted)" }} />
              </div>
              <div className={s.legend}>
                {[
                  { l: "Finished", v: "83%", c: "var(--action-primary)" },
                  { l: "Stopped partway", v: "11%", c: "var(--warning)" },
                  { l: "Opened, never started", v: "6%", c: "var(--text-muted)" },
                ].map((x) => (
                  <div key={x.l}><span className={s.swatch} style={{ background: x.c }} /><span className={cx(s.body, s.grow)}>{x.l}</span><span className={cx(s.titleSm, s.num)}>{x.v}</span></div>
                ))}
              </div>
              <p className={cx(s.body, s.secondary)}>Finishers take about 2 minutes.</p>
            </div>

            <div className={cx(s.card, s.filled)}>
              <h3 className={s.title}>Your plan</h3>
              <div className={s.limitRow}>
                <div><span className={s.body}>Forms</span><span className={cx(s.body, s.num)}>22 of 100</span></div>
                <div className={s.track} role="progressbar" aria-label="Forms used" aria-valuenow={22} aria-valuemin={0} aria-valuemax={100}><div className={s.bar} style={{ width: "22%" }} /></div>
              </div>
              <div className={s.limitRow}>
                <div><span className={s.body}>Storage</span><span className={cx(s.body, s.num)}>1.2 of 10 GB</span></div>
                <div className={s.track} role="progressbar" aria-label="Storage used" aria-valuenow={12} aria-valuemin={0} aria-valuemax={100}><div className={s.bar} style={{ width: "12%" }} /></div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Lists grouped by what matters ────────────────────────────────── */}
      <Section title="Lists" note="Grouped by what needs you, not alphabetically. The coloured edge is the form's own brand colour.">
        <div className={s.split}>
          <div className={cx(s.card, s.outlined, s.flush)}>
            <div className={s.cardHead}>
              <h3 className={s.title}>Forms</h3>
              <Button variant="secondary"><Plus size={16} className="mr-2" aria-hidden="true" />New form</Button>
            </div>
            <p className={s.groupLabel}>With unread responses</p>
            {withUnread.map((f) => <Row key={f.title} f={f} />)}
            <p className={s.groupLabel} style={{ paddingTop: 16 }}>Everything else</p>
            {quiet.map((f) => <Row key={f.title} f={f} />)}
          </div>

          <div className={cx(s.card, s.filled, s.flush)}>
            <div className={s.cardHead}><h3 className={s.title}>Activity</h3><Button variant="ghost">See all</Button></div>
            {ACTIVITY.map((g) => (
              <div key={g.day}>
                <p className={s.groupLabel}>{g.day}</p>
                {g.items.map((a) => (
                  <div key={a.who} className={s.row} style={{ minHeight: 56 }}>
                    <span className={s.monogram} style={{ background: a.color }} aria-hidden="true">{a.who[0]}</span>
                    <span className={s.grow}>
                      <span className={s.body} style={{ display: "block" }}><strong style={{ fontWeight: 500 }}>{a.who}</strong> {a.what}</span>
                      <span className={s.meta}>{a.when}</span>
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Small cards: three different weights, not one tile repeated ──── */}
      <Section title="Small cards" note="A quick action, a person and a template are different things, so they don't share one shape.">
        <div className={s.grid3}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { icon: <Palette aria-hidden="true" />, t: "Change branding" },
              { icon: <UserPlus aria-hidden="true" />, t: "Invite a teammate" },
              { icon: <ArrowDownToLine aria-hidden="true" />, t: "Export all responses" },
              { icon: <Trash2 aria-hidden="true" />, t: "Open trash" },
            ].map((x) => (
              <button key={x.t} type="button" className={cx(s.card, s.outlined, s.compact, s.interactive)}>
                <span style={{ display: "inline-flex", color: "var(--m3-on-primary-container)" }}>{x.icon}</span>
                <span className={cx(s.titleSm, s.grow)}>{x.t}</span>
                <ChevronRight size={16} aria-hidden="true" style={{ color: "var(--text-muted)" }} />
              </button>
            ))}
          </div>

          <div className={cx(s.card, s.outlined, s.flush)}>
            <div className={s.cardHead}><h3 className={s.title}>Team</h3><span className={s.meta}>3 members</span></div>
            {MEMBERS.map((m) => (
              <div key={m.name} className={s.row} style={{ minHeight: 56 }}>
                <span className={s.monogram} style={{ background: m.color }} aria-hidden="true">{m.name[0]}</span>
                <span className={cx(s.titleSm, s.grow, s.ellipsis)}>{m.name}</span>
                <span className={cx(s.chip, m.role === "Owner" && s.chipOn)}>{m.role}</span>
              </div>
            ))}
          </div>

          <button type="button" className={cx(s.card, s.elevated, s.flush, s.interactive)}>
            <span className={s.preview} style={{ background: "linear-gradient(135deg, #3C69CC, #1F3A7A)", height: 96 }}>
              <LayoutTemplate size={22} aria-hidden="true" />
            </span>
            <span style={{ padding: 16, display: "flex", flexDirection: "column", gap: 6 }}>
              <span className={s.title}>Event registration</span>
              <span className={cx(s.body, s.secondary)}>Name, email, ticket type and dietary needs. 12 fields.</span>
              <span style={{ marginTop: 6 }}><span className="bg-btn bg-btn-secondary bg-btn-sm"><Plus size={16} className="mr-2" aria-hidden="true" />Use this template</span></span>
            </span>
          </button>
        </div>
      </Section>

      {/* ── Messages ─────────────────────────────────────────────────────── */}
      <Section title="Messages and empty states" note="Say what happened and what to do next. Errors don't apologise.">
        <div className={s.grid2}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className={cx(s.card, s.banner)} style={{ background: "var(--success-surface)", color: "var(--success-text)" }} role="status">
              <CheckCircle2 aria-hidden="true" style={{ width: 22, height: 22, flex: "none" }} />
              <div><p className={s.titleSm}>Your form is live</p><p className={s.body}>Anyone with the link can answer it. The link stays the same if you publish again.</p></div>
            </div>
            <div className={cx(s.card, s.banner)} style={{ background: "var(--warning-surface)", color: "var(--warning-text)" }} role="status">
              <AlertTriangle aria-hidden="true" style={{ width: 22, height: 22, flex: "none" }} />
              <div><p className={s.titleSm}>2 responses left</p><p className={s.body}>The form closes at 50 responses. Raise the limit in Behaviour to keep it open.</p></div>
            </div>
            <div className={cx(s.card, s.banner, s.tonal)} role="status">
              <BadgeCheck aria-hidden="true" style={{ width: 22, height: 22, flex: "none" }} />
              <div><p className={s.titleSm}>2 forms moved to Trash</p><p className={s.body}>You can restore them for 30 days.</p></div>
              <Button variant="ghost" className="ml-auto">Undo</Button>
            </div>
          </div>

          <div className={cx(s.card, s.outlined)} style={{ alignItems: "flex-start", padding: 28, gap: 12 }}>
            <svg width="88" height="56" viewBox="0 0 88 56" aria-hidden="true">
              <rect x="1" y="1" width="86" height="54" rx="8" fill="none" stroke="var(--m3-outline)" strokeWidth="2" />
              <path d="M14 14h30M14 24h20" stroke="var(--m3-outline)" strokeWidth="2" strokeLinecap="round" />
              <rect x="50" y="30" width="8" height="14" rx="2" fill="var(--m3-primary-container)" />
              <rect x="62" y="22" width="8" height="22" rx="2" fill="var(--action-primary)" opacity="0.65" />
            </svg>
            <h3 className={s.title}>No exports yet</h3>
            <p className={cx(s.body, s.secondary)} style={{ maxWidth: "40ch" }}>
              Open a form&apos;s inbox and choose Export. Your file appears here and stays for 24 hours.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Button variant="primary"><Inbox size={16} className="mr-2" aria-hidden="true" />Go to inbox</Button>
              <Button variant="ghost"><Share2 size={16} className="mr-2" aria-hidden="true" />What can I export?</Button>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}
