"use client";

import React, { useState } from "react";
import { Home, Inbox, Settings, User } from "lucide-react";
import {
  Alert,
  AppShell,
  Avatar,
  Badge,
  Breadcrumb,
  Button,
  Card,
  Checkbox,
  ContextSwitcher,
  Drawer,
  EmptyState,
  Input,
  Menu,
  Modal,
  PageHeader,
  Pagination,
  Progress,
  Radio,
  Select,
  Sidebar,
  Skeleton,
  Spinner,
  StatCard,
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-stack bg-gap-4" style={{ marginBottom: "var(--space-8)" }}>
      <h2 className="bg-h3">{title}</h2>
      <div className="bg-stack bg-gap-6">{children}</div>
    </section>
  );
}

function Example({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-stack bg-gap-2">
      <span className="bg-caption">{label}</span>
      <div className="bg-row bg-gap-3" style={{ flexWrap: "wrap", alignItems: "center" }}>
        {children}
      </div>
    </div>
  );
}

const TABLE_ROWS = [
  { id: "1", name: "Contact form", responses: 128 },
  { id: "2", name: "Event RSVP", responses: 42 },
];

// Every primitive from Phases 2–5, exercised with representative props (requirements.md 3.1).
// Rendered inside frame/page.tsx's iframe; theme is applied by the parent shell directly on
// #gallery-root via the DOM, not read here.
export function UiGalleryContent() {
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [checked, setChecked] = useState(true);
  const [page, setPage] = useState(3);

  return (
    <div
      id="gallery-root"
      style={{
        backgroundColor: "var(--bg-page)",
        color: "var(--text-primary)",
        minHeight: "100%",
        padding: "var(--space-6)",
      }}
    >
      <Section title="Form controls">
        <Example label="Button">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="primary" isLoading>
            Loading
          </Button>
          <Button variant="primary" disabled>
            Disabled
          </Button>
        </Example>
        <Example label="Input">
          <Input id="gallery-input" label="Email" placeholder="you@example.com" />
          <Input id="gallery-input-error" label="Email" error="Enter a valid email" />
        </Example>
        <Example label="Textarea">
          <Textarea id="gallery-textarea" label="Message" placeholder="Say something" />
        </Example>
        <Example label="Select">
          <Select id="gallery-select" label="Role">
            <option>Owner</option>
            <option>Editor</option>
            <option>Viewer</option>
          </Select>
        </Example>
        <Example label="Checkbox / Radio / Switch">
          <Checkbox id="gallery-checkbox" label="Send me updates" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
          <Radio id="gallery-radio" name="gallery-radio" label="Option A" defaultChecked />
          <Switch id="gallery-switch" checked={checked} onChange={setChecked} />
        </Example>
        <Example label="Badge / Tag / Avatar">
          <Badge variant="primary">Primary</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="error">Error</Badge>
          <Badge variant="outline">Outline</Badge>
          <Tag>Marketing</Tag>
          <Avatar name="Ada Lovelace" />
          <Avatar name="Grace Hopper" size="lg" />
        </Example>
      </Section>

      <Section title="Layout, data, feedback">
        <Example label="Card / StatCard">
          <Card>Plain card content</Card>
          <StatCard label="Responses" value="1,204" delta={{ label: "vs last week", direction: "up" }} />
        </Example>
        <Example label="Table">
          <Table
            columns={[
              { key: "name", header: "Form", render: (r) => r.name },
              { key: "responses", header: "Responses", render: (r) => r.responses, align: "right" },
            ]}
            rows={TABLE_ROWS}
            rowKey={(r) => r.id}
          />
        </Example>
        <Example label="Tabs">
          <Tabs
            tabs={[
              { id: "overview", label: "Overview" },
              { id: "responses", label: "Responses" },
            ]}
            activeId={activeTab}
            onChange={setActiveTab}
          />
        </Example>
        <Example label="Modal / Drawer">
          <Button variant="secondary" onClick={() => setModalOpen(true)}>
            Open modal
          </Button>
          <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Delete form?" description="This can't be undone.">
            <div className="bg-row bg-gap-3">
              <Button variant="destructive" onClick={() => setModalOpen(false)}>
                Delete
              </Button>
              <Button variant="secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
            </div>
          </Modal>
          <Button variant="secondary" onClick={() => setDrawerOpen(true)}>
            Open drawer
          </Button>
          <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} title="Form settings">
            <p className="bg-body-sm">Drawer content goes here.</p>
          </Drawer>
        </Example>
        <Example label="Menu">
          <Menu
            trigger="Actions"
            triggerLabel="Actions menu"
            items={[
              { id: "edit", label: "Edit", onSelect: () => {} },
              { id: "duplicate", label: "Duplicate", onSelect: () => {} },
              { id: "delete", label: "Delete", onSelect: () => {}, danger: true },
            ]}
          />
        </Example>
        <Example label="Toast">
          <Button variant="secondary" onClick={() => toast("Form saved", "success")}>
            Trigger success toast
          </Button>
          <Button variant="secondary" onClick={() => toast("Could not save", "error")}>
            Trigger error toast
          </Button>
        </Example>
        <Example label="Alert">
          <Alert variant="info" title="Heads up">
            Responses sync every 5 minutes.
          </Alert>
          <Alert variant="error" title="Failed">
            Could not publish this form.
          </Alert>
        </Example>
        <Example label="EmptyState">
          <EmptyState title="No responses yet" description="Share your form to start collecting responses." />
        </Example>
        <Example label="Skeleton">
          <Skeleton variant="title" />
          <Skeleton variant="text" />
          <Skeleton variant="circle" width={40} height={40} />
        </Example>
      </Section>

      <Section title="Navigation, structure">
        <Example label="Pagination">
          <Pagination page={page} totalPages={10} onPageChange={setPage} />
        </Example>
        <Example label="Breadcrumb">
          <Breadcrumb items={[{ label: "Forms", href: "#" }, { label: "Contact form" }]} />
        </Example>
        <Example label="Stepper">
          <Stepper steps={[{ label: "Details" }, { label: "Fields" }, { label: "Publish" }]} currentStep={1} />
        </Example>
        <Example label="Progress">
          <Progress value={68} label="Uploading" />
          <Progress value={100} variant="success" size="small" />
        </Example>
        <Example label="Tooltip">
          <Tooltip content="Delete this form">
            <Button variant="ghost">Hover or focus me</Button>
          </Tooltip>
        </Example>
        <Example label="Spinner">
          <Spinner />
          <Spinner size="large" />
        </Example>
      </Section>

      <Section title="App shell">
        <div style={{ height: 260, overflow: "hidden", border: "1px solid var(--border-default)", borderRadius: "var(--bg-radius-lg)" }}>
          <AppShell
            topBar={(toggle) => (
              <TopBar brand="Beginso" onMenuClick={toggle} actions={<ContextSwitcher currentLabel="Acme Inc" workspaces={[{ id: "1", name: "Acme Inc" }]} />} />
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
            <PageHeader
              title="Responses"
              breadcrumb={[{ label: "Forms", href: "#" }, { label: "Responses" }]}
              actions={<Button variant="primary">Export</Button>}
            />
          </AppShell>
        </div>
      </Section>
    </div>
  );
}
