# Beginso

A form management platform that goes beyond collecting responses. Create forms, share them publicly, manage incoming submissions with workflow tracking, and view auto-generated dashboards — all in one place, without a spreadsheet in sight.

**Status: Beginso V2.0.0 complete, 31 Oct 2026** (declared by the owner; Sprints 7 to 14 built, plus the October work) · MVP v1.0 shipped earlier. Status, open items and verification: `Beginso-Report/PROJECT_STATUS.md`. *Last updated 31 Oct 2026, checked against `main` `3f98ff5`; the `version` field in `package.json` is `2.1.0` and is set to the release number in a separate step.*

---

## Contents

- [What this is](#what-this-is) · [User roles](#user-roles) · [Core flow](#core-user-flow)
- [Features](#key-features) · [What V2 added](#what-v2-added) · [Scope](#scope)
- [Tech stack](#tech-stack) · [Project structure](#project-structure) · [Design system](#design-system)
- [Security](#security--reliability) · [Timeline](#development-timeline) · [Screens](#screens-reference)
- [Getting started](#getting-started) · [Testing](#testing) · [Contributing](#contributing)

---

## What this is

Most form tools stop at collection. Beginso picks up where they leave off.

Once a response arrives, you track it through a workflow, view a dashboard that builds itself, and export reports as CSV or PDF — all inside the same product. The goal is to make post-submission work as smooth as the collection itself, for people with no technical background.

---

## User roles

| Role | Who | Authentication | What they do |
|---|---|---|---|
| **User** | Small businesses, freelancers, educators, recruiters, event organisers, NGOs | Firebase Auth — email/password or Google | Creates forms, configures branding and logic, tracks response status, views dashboards, exports reports |
| **Respondent** | Anyone with the link | None required | Fills public forms, uploads files, submits |
| **Admin** | Platform developers and operators | Firebase Auth + manual DB role flag | Monitors logs, manages accounts, tracks usage, reviews the audit trail |

---

## Core user flow

```
User creates form  →  publishes and shares the link
        ↓
Respondent submits  →  files upload through backend storage
        ↓
User reviews responses  →  tracks status  →  views the auto-dashboard
        ↓
User exports CSV or PDF
```

---

## Key features

### Form builder

Drag-and-drop canvas with **10 field types** — short text, long text, email, phone, number, date, dropdown, multiple choice, checkbox, file upload. Single-level conditional logic (`IF field A is value → SHOW/HIDE field B`). Custom branding with logo uploads, cover images and a primary colour selector. Publishing generates a shareable link, an embed snippet and a QR code.

### Response management

Paginated data grid with search, status filter tabs and bulk actions. Read-only submission detail showing all answers, file upload states and a metadata sidebar. Workflow tracking through **New → In Progress → Completed**.

### Auto-dashboard

Generates itself after the first submission — no configuration. Stat cards, response trend charts, status distribution and per-question visualisations via Apache ECharts, with date-range filtering.

### Reports and exports

CSV export streams response data directly. PDF summary reports are generated with **PDFKit** — a pure-JS engine with no browser binary dependency, which replaced Puppeteer on 13 August 2026.

### Public form experience

Responsive from 320px up. Step-by-step progress indicators, client-side validation, drag-and-drop file uploads. Dedicated screens for draft or closed forms, and a success confirmation with an optional redirect countdown.

### Admin console — internal

Platform overview with global stats and error/abuse monitors. Paginated, filterable structured log viewer with expandable stack traces. User CRUD including workspace management, account suspension and hard deletion with cascading cleanup. Immutable audit trail of every admin operation.

---

## What V2 added

V2 turned a single-admin tool into a multi-user product. It is **complete as of 31 Oct 2026**. The three changes that matter most:

1. **More than one person can work on a form**: members, roles, invitations, assignment, internal notes, and sharing a single form.
2. **A form does not have to belong to a team**: a personal space sits alongside workspaces, and forms move between them.
3. **A response is something you work on, not just read**: custom pipeline stages, scoring, tags, saved views, duplicate flags, and Table, Board, Calendar, Grid and List views.

Added in the last weeks: a branding studio with a live preview and six layouts, a verified-email gate for tracked forms, an insights chart builder with drill-down, a customisable Home with a response map, per-user storage and workspace limits, and response references such as `KALCUS0042`.

Full scope, decisions and the sprint plan live in the shared documentation repository, `Beginso-Report/Beginso-V2/` (the plan) and `Beginso-Report/PROJECT_STATUS.md` (what was delivered). This README does not duplicate them.

---

## Scope

### In the MVP

Workspace and forms management · drag-and-drop builder with 10 field types, conditional logic and branding · public form with progress bar, validation and file uploads · response hub with data table, workflow status and ECharts dashboards · CSV and PDF export · internal admin console.

### Built in V2 (complete, 31 Oct 2026)

Multi-user workspaces and roles · personal space alongside workspaces · custom pipeline stages · response scoring · tags, assignment and internal notes · board and calendar response views · global search · notifications · archive and trash.

### Not planned

Custom dashboard builders · Stripe payment fields · webhooks and third-party integrations · native mobile apps.

---

## Tech stack

**Frontend** — Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Zustand · TanStack Query · React Hook Form · Zod · dnd-kit · Apache ECharts · Lucide React

**Backend** — Express.js · Node.js 20 LTS · TypeScript · Mongoose · Zod · Multer · PDFKit · Helmet · CORS · express-rate-limit · pino

**Data** — MongoDB Atlas for application data · Firebase Authentication for login credentials only

**Auth** — Firebase login → same-origin Next.js BFF → Express JWT session → HttpOnly Secure cookie on the frontend domain (`SameSite=Lax`)

**Storage** — the audited backend currently writes to local `/uploads`. Durable R2-compatible object storage remains a deployment requirement unless the single-node constraint is accepted explicitly.

**Deployment** — Vercel for the frontend (`beginso.com`) · Render, Railway or a VPS for the backend

---

## Project structure

This repository holds the **frontend only**. The Express/MongoDB backend is a separate repository, consumed over HTTPS REST via `NEXT_PUBLIC_API_URL` — see `docs/backend-contract/api-reference.md` for the current contract.

```
Beginso/                    # Next.js 16 application (this repo)
├── src/
│   ├── app/                # App Router: (auth), (user), onboarding/, api/
│   ├── components/         # ui/, common/, dashboard/, form-builder/, public-form/,
│   │                       #   responses/, reports/, analytics/, settings/, templates/,
│   │                       #   landing/, auth/, providers/
│   ├── services/           # One per domain: auth, forms, responses, analytics, reports,
│   │                       #   settings, templates, notifications, publicForm, upload, dashboard
│   ├── store/              # Zustand stores (builderStore.ts)
│   ├── lib/                # Firebase client, axios instance, schemas, auth context, helpers
│   ├── hooks/              # useAuth, useDebounce, ...
│   ├── types/              # Shared TypeScript types
│   └── proxy.ts            # Route guards; validates the HttpOnly session with the backend
├── __tests__/              # Vitest unit and property-based tests
├── e2e/                    # Playwright end-to-end tests + mock backend server
├── (no docs/ folder)       # Documentation lives in the Beginso-Report repository (Beginso-Frontend-Report/)
├── .kiro/specs/            # Day-by-day sprint task specifications
└── .env.local              # Environment configuration
```

### How authentication actually works

Firebase supplies a one-time identity token at login. The Next.js BFF exchanges it for the backend JWT, stores that JWT **only** in the HttpOnly `beginso_session` cookie, and forwards it server-to-server. `src/proxy.ts` validates the session against the backend's `/api/auth/me`.

**Browser JavaScript never receives or stores the JWT.**

---

## Design system

### Principles

**Simple first.** Forms, dashboards and settings should be understandable within five seconds by a non-technical user.

**Human, not AI-generated.** Warm, clean, highly usable. No glassmorphism, no heavy gradients, no neon.

**Status is unambiguous.** Badges carry distinct background, border and text colours — Active, Draft, Closed, New, In Progress, Completed.

**Mobile-first for respondents.** Every submission screen is optimised for mobile. The form builder is desktop-only in V1; V2 adds mobile editing with an explicit reorder mode.

### Tokens

| | MVP v1.0 | V2 |
|---|---|---|
| Brand font | Inter | DM Sans |
| Monospace | JetBrains Mono | JetBrains Mono |
| Primary | `#1D4ED8` | `#4274D9` |
| Dark mode | — | Slate palette |

V2 introduces a full component library. Its written rules and the CSS live in `Beginso-Report/Beginso-Design-System/Beginso V2/`.

---

## Security & reliability

**Role protection.** Backend `/api/superadmin/*` and frontend `/superadmin/*` routes are guarded by `requireSuperAdmin`, checking JWT claims.

**Access control.** Every user database query is scoped by `workspaceId` extracted from a verified JWT.

**Suspension.** `blockSuspended` middleware rejects suspended accounts immediately with `403 ACCOUNT_SUSPENDED`.

**Audit logs.** Every admin mutation writes a read-only record to `audit_logs`.

**Spam protection.** Rate limiting at 10 requests per IP per minute per form, plus a hidden honeypot field on public submissions.

**Anonymisation.** IP addresses are SHA-256 hashed before storage. Raw IPs are never saved.

**File uploads.** Multer validates size (100 MB maximum) and MIME type.

---

## Development timeline

### Working rhythm

Monday to Saturday, Sunday off. **Monday–Friday** is development only. **Saturday** is testing — no new feature code. A sprint is done when the Saturday pass is green and every exit criterion is met. *(This was the V2 plan's rhythm; the October work was run task by task with the gate described in `Beginso-Report/HOW-TO-RUN-A-SPRINT.md`.)*

### MVP v1.0 — 8 weeks, all complete

| Wk | Sprint | Focus | Dates |
|---|---|---|---|
| 1 | Sprint 1 | Auth, landing, dashboard foundation | 29 Jun – 04 Jul |
| 2 | Sprint 2 · Part 1 | Builder core: toolbox, dnd-kit canvas, CRUD | 06 Jul – 11 Jul |
| 3 | Sprint 2 · Part 2 | Builder completion: properties, logic, branding, publish | 13 Jul – 18 Jul |
| 4 | Sprint 3 | Public form: SSR, validation, uploads, spam prevention | 20 Jul – 25 Jul |
| 5 | Super Admin | Developer console — logs, user CRUD, audit trail *(separate repo)* | 27 Jul – 01 Aug |
| 6 | Sprint 4 | Response management: table, filters, detail, status updates | 03 Aug – 08 Aug |
| 7 | Sprint 5 | Analytics and reports: ECharts, CSV and PDF export | 10 Aug – 15 Aug |
| 8 | Sprint 6 | Settings, onboarding, in-app notifications | 17 Aug – 22 Aug |

The Super Admin console gained a Mail Logs UI and a last-login-location map after its sprint closed. Sprint 6 added onboarding and the notification bell outside its original spec.

Sprint numbers continue across the product, so **V2 is Sprints 7 to 14, plus Sprint 15 for the October work**. The week-by-week plan lives in `Beginso-Report/Beginso-V2/SPRINT-PLAN.md`.

### V2.0.0: Sprints 7 to 14 and the October work

Dates are the first and last commit in the frontend history that names the sprint; later follow-up work is dated in `Beginso-Report/CHANGELOG.md`. **State** is what the code proves on 31 Oct 2026 (456 test files and 4,115 tests pass, and 209 end-to-end tests pass); **Spec tasks ticked** is the count in the sprint's checklist `.kiro/specs/<sprint>/tasks.md` (a local folder, not in git). The open boxes of Sprints 9 to 14 are mostly manual verification and launch gates (live-backend integration, dark-mode and device passes, production deploy, the `v2.0.0` tag), not missing features; they are listed in `Beginso-Report/PROJECT_STATUS.md` and were not ticked by this README's author.

| Sprint (spec folder) | Focus | Dates (2026) | State | Spec tasks ticked |
|---|---|---|---|---|
| Sprint 7 `sprint-7-foundation` | V2 design system, 20 UI primitives, app shell, landing page rebuild | 01 – 03 Sep | ✅ | 48 of 48 |
| Sprint 8 `sprint-8-workspaces-context` | `/w/[slug]` routing, context switcher, All workspaces, forms manager per context | 07 – 09 Sep | ✅ | 29 of 29 |
| Sprint 9 `sprint-9-team-permissions` | Members, invitations and the accept page, role matrix, per-form access, Shared with me | 10 – 16 Sep | ✅ | 39 of 40 |
| Sprint 10 `sprint-10-events-migration` | Workspace activity, audit log, form events, V1 to memberships migration | 21 – 22 Sep | ✅ built; 🟡 live-backend check not recorded | 42 of 45 |
| Sprint 11 `sprint-11-v2a-hardening` | Permission audit, accessibility, dark mode, view counting; V2a deploy | 23 – 29 Sep | ✅ built; 🟡 the production deploy and 24 h watch items are unticked | 35 of 45 |
| Sprint 12 `sprint-12-inbox-collaboration` | Stages, tags, assignment, notes, scoring, saved views, bulk actions, duplicate flags | 29 Sep – early Oct | ✅ | 44 of 46 |
| Sprint 13 `sprint-13-builder-publish-respondent` | Access modes, review before submit, respondent links, archive and trash, leave guard, layout gallery | 05 Oct | ✅ built; 🟡 the integration and sprint-gate boxes are unticked | 49 of 71 |
| Sprint 14 `sprint-14-insights-search-launch` | Insights, global search, notifications, audits and the launch gates | 06 Oct | ✅ built; 🟡 the audits, gates and launch boxes are unticked | 40 of 64 |
| Sprint 15 `sprint-15-scoring-v2c` | "Scoring, V2c refinements and V2b launch closure": it carries over the Sprint 14 launch tasks (zeros fix, PDF pages, cookie flags, load test, production deploy and the `v2.0.0` tag) | created 21 Oct | ⚪ no task is ticked; scoring itself exists (Sprint 12), and the carried-over launch tasks are in `PROJECT_STATUS.md` | 0 of 63 |
| October work (called "Sprint 15" in the code comments; **no spec folder**) | Home widgets and response map, V2 field types, branding studio and six layouts, storage limits, response layouts and response setup, response references, chart builder with drill-down, verified-email gate | 08 – 29 Oct | ✅ | no checklist |

The plan's week numbers (Weeks 1 to 8) are timeline positions, not sprint numbers. The MVP specs show the same pattern (for example Sprint 1: 155 of 171 ticked), so a ticked box lags the code; the code and the tests are the evidence.


---

## Screens reference

24 screens in the MVP.

| Group | Count | Screens |
|---|---|---|
| Auth & onboarding | 4 | Login · Sign up · Forgot password · Email verification |
| Core platform | 11 | Workspace home · Forms manager · Templates gallery · Form builder · Responses hub · Submission detail · Reports & exports · Auto-dashboard · Settings · Modals & dialogs · Feeds & feedback |
| Respondent side | 3 | Published public form · Form unavailable · Success confirmation |
| Admin console | 4 | Overview · System logs · User management · Audit log *(desktop only)* |
| Reference | 2 | UI elements showcase · Responsive breakpoint guide |

---

## Getting started

### Prerequisites

Node.js **20.x LTS** or higher.

### Setup

**1 · Install**

```bash
npm install
```

**2 · Configure environment**

Create `.env.local` in the project root:

```env
# Backend API
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Firebase Client SDK
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

**3 · Firebase**

Create a project in the [Firebase Console](https://console.firebase.google.com/). Enable **Email/Password** and **Google** sign-in. Copy the web app config into `.env.local`.

In **Authentication → Templates**, set the email action URL to `https://your-frontend-domain/reset-password` so reset links open Beginso's own form. Firebase appends `mode` and `oobCode` automatically — never copy a real code into configuration.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server on `localhost:3000` |
| `npm run build` | Production build — also type-checks |
| `npm run start` | Production server, after building |
| `npm run lint` | ESLint across the repo |
| `npm run type-check` | `tsc --noEmit` — verifies types, no output |
| `npm test` | Vitest suite, once |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:e2e` | Playwright, headless, against a mocked backend |
| `npm run test:e2e:ui` | Playwright interactive mode |

---

## Testing

Two independent layers. **Both must pass before a PR is done**, along with clean `type-check` and `lint`.

### Unit & property tests — Vitest

**`__tests__/`** · `npm test` or `npm run test:watch`

Covers pure logic in isolation: the conditional-logic engine, the dynamic Zod schema builder, file validation, honeypot and draft-persistence helpers. Components are tested via `@testing-library/react`, and services with `fetch` mocked at the network layer.

A subset are **property-based** tests using `fast-check`. Instead of one hand-picked example, they assert an invariant across 100 randomly generated inputs per run — for instance, *"a field hidden by conditional logic never appears in the submitted answers, whatever the rest of the form looks like."*

These never touch a real backend or browser. **686 tests across 111 files**, verified 18 August 2026.

### End-to-end tests — Playwright

**`e2e/`** · `npm run test:e2e` or `npm run test:e2e:ui`

Drives a real Chromium browser against the rendered public form pipeline (`/f/[slug]` and `/f/[slug]/success`) — real inputs, navigation, validation, file picker. `playwright.config.ts` starts a dedicated Next.js server plus `e2e/mockServer.ts`, so the checked-in scenarios never depend on the live backend.

Scenarios are selected by slug — `/f/mock-valid`, `/f/mock-not-found`, `/f/mock-submit-422`. Conventions are documented at the top of `e2e/mockServer.ts`.

**9 spec files, 41 tests** covering SSR rendering, accessibility basics, 320px mobile, validation for all 10 field types, multi-page navigation, conditional logic (including inspecting the real submitted payload to confirm hidden fields never appear), file upload across four cases, submission outcomes (200/422/429/500 plus honeypot), outage versus unavailable handling, the success screen, and draft persistence.

When a spec fails, Playwright saves a screenshot and full trace under `test-results/`. Open it with:

```bash
npx playwright show-trace <path-to-trace.zip>
```

---

## Contributing

Branches are `feature/feature-name` or `bugfix/fix-name`, merged to `main` by pull request. **No direct commits to `main`.**

A PR needs a description of what it does, how to test it, and screenshots for any frontend work.

---

*MVP v1.0 complete · V2 in development · Confidential — internal use*
