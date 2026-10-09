# Beginso

A form management platform that goes beyond collecting responses. Create forms, share them publicly, manage incoming submissions with workflow tracking, and view auto-generated dashboards — all in one place, without a spreadsheet in sight.

**Status:** MVP v1.0 complete · V2 in development

---

## Contents

- [What this is](#what-this-is) · [User roles](#user-roles) · [Core flow](#core-user-flow)
- [Features](#key-features) · [What's next in V2](#whats-next-in-v2) · [Scope](#scope)
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

## What's next in V2

V2 turns a single-admin tool into a multi-user product. The three changes that matter most:

1. **More than one person can work on a form** — members, roles, invitations, assignment, internal notes.
2. **A form does not have to belong to a team** — a personal space sits alongside workspaces, and forms move between them.
3. **A response is something you work on, not just read** — custom pipeline stages, scoring, tags, saved views, duplicate detection.

Full scope, decisions and the sprint plan live in the shared documentation repository, `Beginso-Report/Beginso-V2/`. That is the source of truth for what V2 contains; this README does not duplicate it.

---

## Scope

### In the MVP

Workspace and forms management · drag-and-drop builder with 10 field types, conditional logic and branding · public form with progress bar, validation and file uploads · response hub with data table, workflow status and ECharts dashboards · CSV and PDF export · internal admin console.

### Coming in V2

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
├── docs/                   # Project documentation — see docs/README.md for the map
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

Monday to Saturday, Sunday off. **Monday–Friday** is development only. **Saturday** is testing — no new feature code. A sprint is done when the Saturday pass is green and every exit criterion is met.

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

Sprint numbers continue across the product — **V2 runs sprints 7 to 14**. Its week-by-week plan lives in `Beginso-Report/Beginso-V2/SPRINT-PLAN.md`.

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
