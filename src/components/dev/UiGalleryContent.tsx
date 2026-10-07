"use client";

import React, { useState } from "react";
import { Calendar, FileText, Home, Inbox, LayoutTemplate, MessageSquare, Plus, PlusCircle, Search, Settings, TrendingUp, User } from "lucide-react";
import {
  ActionCard,
  Alert,
  AppShell,
  Avatar,
  AvatarStack,
  Badge,
  BarChart,
  Breadcrumb,
  Button,
  Card,
  CHART_COLOR,
  ChartCard,
  Checkbox,
  ComboChart,
  ContextSwitcher,
  Drawer,
  DonutWithLegend,
  EmptyState,
  Input,
  LegendDots,
  LineChart,
  Menu,
  Modal,
  PageHeader,
  Pagination,
  Progress,
  ProgressBars,
  Radio,
  Ring,
  RingSet,
  Select,
  Sidebar,
  Skeleton,
  Spinner,
  StatCard,
  StatusBadge,
  Stepper,
  Switch,
  Table,
  Tabs,
  Tag,
  Textarea,
  TopBar,
  Tooltip,
  useToast,
} from "@/components/ui";
import { FormCard } from "@/components/forms/FormCard";
import { FormTile } from "@/components/forms/FormTile";
import { FormsViewToggle } from "@/components/forms/FormsViewToggle";
import type { FormsView } from "@/hooks/useFormsView";
import { Illustration } from "@/components/illustrations/Illustration";
import { ILLUSTRATION_NAMES } from "@/components/illustrations/illustrations.generated";
import { TemplateCard } from "@/components/templates/TemplateCard";
import type { Form, Template } from "@/types/form";
import { bx } from "@/lib/utils";

// ── Layout helpers ────────────────────────────────────────────────────────────
interface SectionDef { id: string; title: string }
const SECTIONS: SectionDef[] = [
  { id: "foundations", title: "Foundations" },
  { id: "form-controls", title: "Form controls" },
  { id: "feedback", title: "Feedback" },
  { id: "navigation", title: "Navigation, structure" },
  { id: "cards", title: "Cards" },
  { id: "stat-charts", title: "Stat cards with charts" },
  { id: "chart-cards", title: "Chart cards" },
  { id: "data", title: "Data, overlays, empty states" },
  { id: "illustrations", title: "Illustrations" },
  { id: "app-shell", title: "App shell" },
];

function Section({ id, title, note, children }: { id: string; title: string; note?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="flex scroll-mt-6 flex-col gap-5" aria-labelledby={`${id}-h`}>
      <div className="border-b border-(--border-default) pb-3">
        <h2 id={`${id}-h`} className="bg-h3">{title}</h2>
        {note && <p className="bg-body-sm text-(--text-muted)">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function Example({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="bg-overline text-(--text-muted)">{label}</span>
      <div className={bx("flex flex-wrap items-center gap-3", className)}>{children}</div>
    </div>
  );
}

const GRID_3 = "grid w-full grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3";
const GRID_4 = "grid w-full grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4";

// ── Sample data ───────────────────────────────────────────────────────────────
const TABLE_ROWS = [
  { id: "1", name: "Contact form", responses: 128 },
  { id: "2", name: "Event RSVP", responses: 42 },
];

const SERIES = [8, 12, 9, 15, 13, 20, 17, 24, 22, 30];
const SERIES_B = [5, 7, 9, 8, 12, 11, 15, 14, 18, 17];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEK = [24, 30, 42, 44, 62, 46, 32].map((value, i) => ({ label: DAYS[i], value }));
const TREND = [14, 20, 26, 32, 47, 52, 64].map((value, i) => ({ label: DAYS[i], value }));
const STATUS = [
  { label: "Published", value: 2, color: CHART_COLOR.primary },
  { label: "Draft", value: 3, color: CHART_COLOR.soft },
  { label: "Closed", value: 2, color: CHART_COLOR.warning },
];

const sampleForm = (over: Partial<Form>): Form => ({
  _id: "f", workspaceId: null, title: "Form", description: "", status: "draft", fields: [], pages: [],
  branding: {}, settings: {} as Form["settings"], schemaVersion: 1, responseCount: 0,
  createdAt: "2026-09-01T00:00:00Z", updatedAt: "2026-09-26T12:30:00Z", ...over,
} as Form);
const FORMS: Form[] = [
  sampleForm({ _id: "1", title: "Customer Feedback Survey", description: "Collect feedback from your customers", status: "published", responseCount: 142 }),
  sampleForm({ _id: "2", title: "Event Registration", description: "Register attendees for the event", status: "draft", responseCount: 8 }),
  sampleForm({ _id: "3", title: "Job Application", description: "Collect applicant details", status: "closed", responseCount: 64 }),
];

const sampleTemplate = (over: Partial<Template>): Template => ({
  _id: "t", name: "Template", description: "", category: "General", fields: [], settings: {} as Template["settings"], isActive: true, ...over,
} as Template);
const TEMPLATES: Template[] = [
  sampleTemplate({ _id: "1", name: "Pitch Plan", description: "Present your project, team, and business plan for review.", category: "Advanced", fields: Array(21).fill({}) }),
  sampleTemplate({ _id: "2", name: "Customer Feedback Survey", description: "Gather customer ratings, feedback, and recommendations.", category: "Feedback", fields: Array(3).fill({}) }),
  sampleTemplate({ _id: "3", name: "Job Application", description: "Collect applicant contact details and experience.", category: "HR", fields: Array(5).fill({}) }),
];

const FORM_TITLES = ["Customer Feedback Survey", "Event Registration", "Job Application", "Product Order Form", "Contact Us", "Pitch Plan", "Quiz", "Payment", "Newsletter signup", "Support request", "test"];

const TYPE_SCALE: [string, string][] = [
  ["bg-display", "Display — 36"], ["bg-h1", "Heading 1 — 30"], ["bg-h2", "Heading 2 — 24 (page titles)"],
  ["bg-h3", "Heading 3 — 20"], ["bg-h4", "Heading 4 — 17"], ["bg-h5", "Heading 5 — 15"],
  ["bg-body-lg", "Body large — 15"], ["bg-body", "Body — 13"], ["bg-body-sm", "Body small — 12"],
  ["bg-caption", "Caption — 11"], ["bg-overline", "Overline"],
];

const TOKENS = [
  "--bg-page", "--bg-subtle", "--bg-sunken", "--surface-card", "--surface-hover", "--accent-soft",
  "--text-primary", "--text-secondary", "--text-muted", "--text-disabled", "--border-default", "--border-strong",
  "--action-primary", "--action-primary-hover", "--success", "--warning", "--error", "--info",
  "--success-surface", "--warning-surface", "--error-surface", "--info-surface", "--chart-muted", "--chart-muted-2",
];

// Every shared component, exercised with representative props. Rendered inside frame/page.tsx's
// iframe (so real @media breakpoints respond to the chosen width); the theme is applied by the
// parent shell on #gallery-root's document, not read here.
export function UiGalleryContent() {
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [checked, setChecked] = useState(true);
  const [page, setPage] = useState(3);
  const [view, setView] = useState<FormsView>("list");

  return (
    <div id="gallery-root" className="flex min-h-full" style={{ backgroundColor: "var(--bg-page)", color: "var(--text-primary)" }}>
      <nav aria-label="Gallery sections" className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col gap-1 overflow-y-auto border-r border-(--border-default) bg-(--surface-card) p-4 lg:flex">
        <span className="bg-overline mb-2 text-(--text-muted)">Sections</span>
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="rounded-md px-3 py-2 bg-body-sm text-(--text-secondary) no-underline hover:bg-(--surface-hover) hover:text-(--text-primary)">
            {s.title}
          </a>
        ))}
      </nav>

      <main className="flex min-w-0 flex-1 flex-col gap-12 p-6 sm:p-8">
        {/* ── Foundations ─────────────────────────────────────────────────── */}
        <Section id="foundations" title="Foundations" note="Type scale, colour tokens, radius and shadow. Everything below uses these — never raw hex.">
          <Example label="Typography" className="flex-col items-start">
            {TYPE_SCALE.map(([cls, text]) => (
              <span key={cls} className={cls}>{text}</span>
            ))}
          </Example>
          <Example label="Colour tokens">
            <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-6">
              {TOKENS.map((t) => (
                <div key={t} className="flex flex-col gap-1.5">
                  <span className="h-12 rounded-md border border-(--border-default)" style={{ backgroundColor: `var(${t})` }} />
                  <code className="bg-caption text-(--text-muted)">{t}</code>
                </div>
              ))}
            </div>
          </Example>
          <Example label="Shadow / radius">
            {["--shadow-sm", "--shadow-md", "--shadow-lg"].map((s) => (
              <span key={s} className="flex h-16 w-28 items-center justify-center rounded-lg bg-(--surface-card) bg-caption text-(--text-muted)" style={{ boxShadow: `var(${s})` }}>{s.slice(2)}</span>
            ))}
          </Example>
        </Section>

        {/* ── Form controls ───────────────────────────────────────────────── */}
        <Section id="form-controls" title="Form controls">
          <Example label="Button — variants">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="primary" isLoading>Loading</Button>
            <Button variant="primary" disabled>Disabled</Button>
          </Example>
          <Example label="Button — size, icon, link-button">
            <Button size="small">Small</Button>
            <Button><Plus size={16} className="mr-2" aria-hidden="true" />With icon</Button>
            <a href="#form-controls" className="bg-btn bg-btn-secondary"><LayoutTemplate size={16} className="mr-2" aria-hidden="true" />Link as button</a>
          </Example>
          <Example label="Input" className="items-start">
            <div className="w-64"><Input id="g-input" label="Email" placeholder="you@example.com" /></div>
            <div className="w-64"><Input id="g-input-icon" label="Search (leftIcon)" placeholder="Search forms…" leftIcon={<Search className="bg-icon" />} /></div>
            <div className="w-64"><Input id="g-input-error" label="Email (error)" error="Enter a valid email" defaultValue="nope" /></div>
            <div className="w-64"><Input id="g-input-disabled" label="Disabled" disabled defaultValue="Read only" /></div>
          </Example>
          <Example label="Textarea / Select" className="items-start">
            <div className="w-72"><Textarea id="g-textarea" label="Message" placeholder="Say something" /></div>
            <div className="w-56">
              <Select id="g-select" label="Role"><option>Owner</option><option>Editor</option><option>Viewer</option></Select>
            </div>
          </Example>
          <Example label="Checkbox / Radio / Switch">
            <Checkbox id="g-check" label="Send me updates" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
            <Radio id="g-radio" name="g-radio" label="Option A" defaultChecked />
            <Switch id="g-switch" checked={checked} onChange={setChecked} />
          </Example>
          <Example label="FormsViewToggle">
            <FormsViewToggle value={view} onChange={setView} />
            <span className="bg-body-sm text-(--text-muted)">value: {view}</span>
          </Example>
        </Section>

        {/* ── Feedback ────────────────────────────────────────────────────── */}
        <Section id="feedback" title="Feedback">
          <Example label="Alert" className="items-stretch">
            <div className="flex w-full flex-col gap-3">
              <Alert variant="info" title="Heads up">Responses sync every 5 minutes.</Alert>
              <Alert variant="success" title="Published">Your form is live.</Alert>
              <Alert variant="warning" title="Almost full">You have used 90% of your response limit.</Alert>
              <Alert variant="error" title="Failed">Could not publish this form.</Alert>
            </div>
          </Example>
          <Example label="Badge / Tag">
            <Badge variant="primary">Primary</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="error">Error</Badge>
            <Badge variant="info">Info</Badge>
            <Badge variant="outline">Outline</Badge>
            <Tag>Marketing</Tag>
            <Tag onRemove={() => {}}>Removable</Tag>
          </Example>
          <Example label="StatusBadge">
            {(["draft", "published", "closed", "active", "new", "in_progress", "completed", "neutral"] as const).map((v) => (
              <StatusBadge key={v} variant={v}>{v.replace("_", " ")}</StatusBadge>
            ))}
          </Example>
          <Example label="Progress / Spinner / Skeleton" className="items-start">
            <div className="w-64 flex flex-col gap-3"><Progress value={68} label="Uploading" /><Progress value={100} variant="success" size="small" /></div>
            <Spinner />
            <Spinner size="large" />
            <div className="flex w-56 flex-col gap-2"><Skeleton variant="title" /><Skeleton variant="text" /><Skeleton variant="circle" width={40} height={40} /></div>
          </Example>
          <Example label="Toast / Tooltip">
            <Button variant="secondary" onClick={() => toast("Form saved", "success")}>Success toast</Button>
            <Button variant="secondary" onClick={() => toast("Could not save", "error")}>Error toast</Button>
            <Tooltip content="Delete this form"><Button variant="ghost">Hover or focus me</Button></Tooltip>
          </Example>
        </Section>

        {/* ── Navigation ──────────────────────────────────────────────────── */}
        <Section id="navigation" title="Navigation, structure">
          <Example label="PageHeader — default / actionsAlign=center" className="items-stretch">
            <div className="flex w-full flex-col gap-6">
              <PageHeader title="Forms" description="Build, manage, and publish your forms." actions={<Button>Create Form</Button>} />
              <PageHeader
                title="Forms"
                description="Build, manage, and publish your forms."
                actionsAlign="center"
                actions={<><a href="#navigation" className="bg-btn bg-btn-secondary"><LayoutTemplate size={16} className="mr-2" aria-hidden="true" />Templates</a><Button><Plus size={16} className="mr-2" aria-hidden="true" />Create Form</Button></>}
              />
            </div>
          </Example>
          <Example label="Tabs" className="items-stretch">
            <div className="w-full">
              <Tabs tabs={[{ id: "overview", label: "Overview" }, { id: "responses", label: "Responses" }, { id: "settings", label: "Settings" }]} activeId={activeTab} onChange={setActiveTab} />
            </div>
          </Example>
          <Example label="Breadcrumb"><Breadcrumb items={[{ label: "Forms", href: "#" }, { label: "Contact form" }]} /></Example>
          <Example label="Pagination"><Pagination page={page} totalPages={10} onPageChange={setPage} /></Example>
          <Example label="Stepper" className="items-stretch"><div className="w-full max-w-xl"><Stepper steps={[{ label: "Details" }, { label: "Fields" }, { label: "Publish" }]} currentStep={1} /></div></Example>
          <Example label="Menu">
            <Menu trigger="Actions" triggerLabel="Actions menu" triggerClassName="bg-btn bg-btn-secondary" items={[
              { id: "edit", label: "Edit", onSelect: () => {} },
              { id: "duplicate", label: "Duplicate", onSelect: () => {} },
              { id: "delete", label: "Delete", onSelect: () => {}, danger: true },
            ]} />
          </Example>
          <Example label="Avatar / AvatarStack">
            <Avatar name="Ada Lovelace" /><Avatar name="Grace Hopper" size="lg" /><Avatar size="sm" />
            <AvatarStack people={[{ name: "Ada Lovelace" }, { name: "Grace Hopper" }, { name: "Linus T" }, { name: "Margaret H" }]} max={3} />
          </Example>
        </Section>

        {/* ── Cards ───────────────────────────────────────────────────────── */}
        <Section id="cards" title="Cards" note="Every card shares the Tinted surface (.bg-card): soft gradient, hairline border, lifts on hover.">
          <Example label="Card — default / flat / sunken / hover" className="items-stretch">
            <div className={GRID_4}>
              <Card>Default card</Card>
              <Card className="bg-card-flat">Flat</Card>
              <Card className="bg-card-sunken">Sunken</Card>
              <Card className="bg-card-hover">Hover lift</Card>
            </div>
          </Example>
          <Example label="StatCard — plain (icon + number + label + delta)" className="items-stretch">
            <div className={GRID_4}>
              <StatCard label="Total Forms" value={6} icon={<FileText />} />
              <StatCard label="Responses" value="1,204" icon={<MessageSquare />} delta={{ label: "+12% vs last week", direction: "up" }} />
              <StatCard label="Published" value={4} unit="/ 6" icon={<FileText />} />
              <StatCard label="Who can see it" value="Just you" icon={<User />} />
            </div>
          </Example>
          <Example label="ActionCard" className="items-stretch">
            <div className={GRID_3}>
              <ActionCard href="#cards" title="Create a form" hint="Start from scratch" icon={<PlusCircle />} />
              <ActionCard href="#cards" title="Browse templates" hint="Start with a proven structure" icon={<LayoutTemplate />} />
            </div>
          </Example>
          <Example label="FormTile — icon + colour from the form's title (lib/formVisual)">
            <div className="flex flex-wrap gap-5">
              {FORM_TITLES.map((t) => (
                <span key={t} className="flex items-center gap-3"><FormTile title={t} /><span className="bg-body-sm text-(--text-secondary)">{t}</span></span>
              ))}
            </div>
          </Example>
          <Example label="FormCard (grid view)" className="items-stretch">
            <div className={GRID_3}>
              {FORMS.map((f) => (
                <FormCard key={f._id} form={f} href="#cards" maxResponses={142} menu={
                  <Menu trigger="⋮" triggerLabel="More options" align="end" items={[{ id: "e", label: "Edit", onSelect: () => {} }]} />
                } />
              ))}
            </div>
          </Example>
          <Example label="TemplateCard (banner) — regular and wide" className="items-stretch">
            <div className={GRID_3}>
              {TEMPLATES.map((t) => (
                <TemplateCard key={t._id} template={t} onUse={() => {}} onPreview={() => {}} isLoading={false} />
              ))}
              <TemplateCard template={TEMPLATES[0]} onUse={() => {}} onPreview={() => {}} isLoading={false} wide />
            </div>
          </Example>
        </Section>

        {/* ── Stat cards with charts ──────────────────────────────────────── */}
        <Section id="stat-charts" title="Stat cards with charts" note="StatCard chart={{ kind: … }} — big bare icon + number on the left, the chart on the right.">
          <div className={GRID_3}>
            <StatCard label="Responses" value={114} icon={<MessageSquare />} chart={{ kind: "bars", values: [3, 5, 4, 8, 6, 11, 10, 15] }} />
            <StatCard label="Published" value={2} unit="/ 4" icon={<FileText />} chart={{ kind: "progress", percent: 50 }} />
            <StatCard label="Total Responses" value={76} icon={<MessageSquare />} chart={{ kind: "split", parts: [{ value: 71 }, { value: 5 }] }} />
            <StatCard label="This month" value={50} icon={<Calendar />} chart={{ kind: "line", values: SERIES }} />
            <StatCard label="Total Responses" value={114} icon={<TrendingUp />} chart={{ kind: "dual", values: [4, 7, 5, 10, 8], part: [3, 5, 4, 7, 6] }} />
            <StatCard label="Total Forms" value={4} icon={<FileText />} chart={{ kind: "line", values: [3, 4, 3, 5, 4, 6, 5, 7, 8, 9], area: false }} />
            <StatCard label="This month" value={50} icon={<Calendar />} chart={{ kind: "stacked", columns: [[3, 2, 1], [4, 3, 2], [5, 3, 2], [6, 5, 3], [7, 5, 4]] }} />
            <StatCard label="Responses" value={114} icon={<TrendingUp />} chart={{ kind: "multi", values: SERIES, secondary: SERIES_B }} />
            <StatCard label="This month" value={50} icon={<Calendar />} chart={{ kind: "columns", values: [4, 6, 5, 11, 3, 4, 5], labels: DAYS }} />
            <StatCard label="Total Forms" value={6} icon={<FileText />} chart={{ kind: "ring", percent: 67 }} />
            <Card className="items-center justify-center">
              <Ring percent={78} size={116} stroke={9}><span className="text-[24px] font-bold leading-7">78%</span><span className="bg-caption text-(--text-muted)">Completion</span></Ring>
            </Card>
            <Card><RingSet rings={[{ percent: 25 }, { percent: 50, color: CHART_COLOR.success }, { percent: 75, color: CHART_COLOR.warning }, { percent: 100 }]} /></Card>
          </div>
        </Section>

        {/* ── Chart cards ─────────────────────────────────────────────────── */}
        <Section id="chart-cards" title="Chart cards" note="ChartCard around BarChart / LineChart / ComboChart / DonutWithLegend / ProgressBars. Measured width, real-pixel axes.">
          <div className="grid w-full grid-cols-1 gap-4 xl:grid-cols-2">
            <ChartCard title="Responses this week"><BarChart data={WEEK} ariaLabel="Responses this week" /></ChartCard>
            <ChartCard title="Response trend"><LineChart data={TREND} ariaLabel="Response trend" /></ChartCard>
            <ChartCard title="Forms by status"><DonutWithLegend segments={STATUS} size={130} /></ChartCard>
            <ChartCard title="Responses by form"><ProgressBars items={[{ label: "Customer Feedback Survey", value: 142 }, { label: "Job Application", value: 64 }, { label: "Event Registration", value: 8 }]} /></ChartCard>
            <ChartCard title="Responses & Forms" legend={<LegendDots items={[{ label: "Responses", color: CHART_COLOR.primary }, { label: "Forms", color: CHART_COLOR.success }]} />}>
              <ComboChart data={WEEK} line={[28, 36, 30, 44, 38, 48, 42]} ariaLabel="Responses and forms by day" />
            </ChartCard>
            <ChartCard title="Daily submissions (30 days — labels thin out)">
              <BarChart data={Array.from({ length: 30 }, (_, i) => ({ label: String((i % 28) + 1).padStart(2, "0"), value: ((i * 7) % 19) + 2 }))} ariaLabel="Daily submissions" />
            </ChartCard>
          </div>
        </Section>

        {/* ── Data, overlays, empty states ────────────────────────────────── */}
        <Section id="data" title="Data, overlays, empty states">
          <Example label="Table" className="items-stretch">
            <div className="w-full">
              <Table
                columns={[
                  { key: "name", header: "Form", render: (r) => r.name },
                  { key: "responses", header: "Responses", render: (r) => r.responses, align: "right" },
                ]}
                rows={TABLE_ROWS}
                rowKey={(r) => r.id}
              />
            </div>
          </Example>
          <Example label="Modal / Drawer">
            <Button variant="secondary" onClick={() => setModalOpen(true)}>Open modal</Button>
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Delete form?" description="This can't be undone.">
              <div className="bg-row bg-gap-3">
                <Button variant="destructive" onClick={() => setModalOpen(false)}>Delete</Button>
                <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
              </div>
            </Modal>
            <Button variant="secondary" onClick={() => setDrawerOpen(true)}>Open drawer</Button>
            <Button variant="secondary" onClick={() => setSheetOpen(true)}>Open bottom sheet</Button>
            <Drawer isOpen={sheetOpen} onClose={() => setSheetOpen(false)} title="Add a field" placement="bottom">
              <p className="bg-body-sm">Bottom sheet content goes here.</p>
            </Drawer>
            <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} title="Form settings">
              <p className="bg-body-sm">Drawer content goes here.</p>
            </Drawer>
          </Example>
          <Example label="EmptyState — icon / illustration + actions" className="items-stretch">
            <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
              <Card><EmptyState icon={<FileText />} title="No responses yet" description="Share your form to start collecting responses." /></Card>
              <Card>
                <EmptyState
                  illustration="empty-forms"
                  icon={<FileText />}
                  title="No forms yet"
                  description="Create your first form to get started collecting responses."
                  actions={<Button><Plus size={16} className="mr-2" aria-hidden="true" />Create Form</Button>}
                />
              </Card>
            </div>
          </Example>
        </Section>

        {/* ── Illustrations ───────────────────────────────────────────────── */}
        <Section id="illustrations" title="Illustrations" note="unDraw, recoloured to tokens by scripts/build-illustrations.mjs. <Illustration name> / EmptyState illustration. Falls back to the icon when a slot has no artwork.">
          <div className="grid w-full grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            {ILLUSTRATION_NAMES.map((name) => (
              <Card key={name} className="items-center gap-2">
                <Illustration name={name} size="sm" />
                <code className="bg-caption text-(--text-muted)">{name}</code>
              </Card>
            ))}
          </div>
        </Section>

        {/* ── App shell ───────────────────────────────────────────────────── */}
        <Section id="app-shell" title="App shell">
          <div style={{ height: 300, overflow: "hidden", border: "1px solid var(--border-default)", borderRadius: "var(--bg-radius-lg)" }}>
            <AppShell
              topBar={(toggle) => (
                <TopBar brand="Beginso" onMenuClick={toggle} actions={<ContextSwitcher currentLabel="Acme Inc" workspaces={[{ id: "1", name: "Acme Inc", slug: "acme" }]} />} />
              )}
              sidebar={(sidebarCollapsed) => (
                <Sidebar
                  collapsed={sidebarCollapsed}
                  groups={[
                    {
                      label: "Workspace",
                      items: [
                        { label: "Home", href: "#home", icon: Home, active: true },
                        { label: "Responses", href: "#responses", icon: Inbox, count: 3 },
                        { label: "Profile", href: "#profile", icon: User },
                        { label: "Settings", href: "#settings", icon: Settings },
                      ],
                    },
                  ]}
                />
              )}
            >
              <PageHeader title="Responses" breadcrumb={[{ label: "Forms", href: "#" }, { label: "Responses" }]} actions={<Button variant="primary">Export</Button>} />
            </AppShell>
          </div>
        </Section>
      </main>
    </div>
  );
}
