# Beginso

A web-based form management platform that goes beyond just collecting responses. Beginso lets users create forms, share them publicly, manage incoming submissions with status tracking, and view auto-generated dashboards — all in one place, without a spreadsheet in sight.

---

## What Is This?

Most form tools stop at collection. Beginso picks up where they leave off.

After a response comes in, the user can track it through a workflow (New → In Progress → Completed), view a dashboard that builds itself automatically, and export reports as CSV or PDF — all inside the same product. The goal is to make post-submission work as smooth as the collection itself, for users with zero technical background.

---

## User Roles

| Role | Target Users | Authentication | Core Functions |
|:---|:---|:---|:---|
| **User** | Small businesses, freelancers, educators, recruiters, event organisers, NGOs | Firebase Authentication (Email/Password or Google) | Creates forms, configures branding/logic, tracks response statuses, views dashboard, exports reports |
| **Respondent** | Anyone with the shared form link | No login required | Fills public forms, uploads files, submits responses |
| **Admin** | Platform developers & operators | Firebase Auth + manual DB role flag | Internal operations: monitors logs, manages user accounts, tracks usage, audit trail |

---

## Core User Flow

```
User creates form → Publishes & shares link
     ↓
Respondent submits → Files upload through the backend storage service
     ↓
User reviews responses → Tracks status (New → In Progress → Completed) → Views auto-dashboard
     ↓
User exports CSV or PDF report
```

---

## Key Features

### Form Builder
- Drag-and-drop builder canvas with 10 field types: Short Text, Long Text, Email, Phone, Number, Date, Dropdown, Multiple Choice, Checkbox, and File Upload.
- Single-level conditional logic rules (IF field A is value → SHOW/HIDE field B).
- Custom form styling and branding: logo uploads, cover images, primary color selectors.
- Seamless publish flow generating unique shareable links, embed HTML codes, and QR codes.

### Response Management
- Response table with paginated data grid, search, status filter tabs, and bulk actions.
- Read-only submission detail cards displaying all answers, file upload states, and metadata sidebars.
- Simple workflow tracking using badges: New → In Progress → Completed.

### Auto-Dashboard
- Generates automatically after the first submission — zero configuration needed.
- Stat cards, response trend charts, status distributions, and per-question visualizations using Apache ECharts.
- Date range filtering.

### Reports & Exports
- CSV export streaming response data directly.
- Headless Chromium (Puppeteer) PDF summary reports.

### Public Form Experience
- Responsive public forms optimized for every screen size from 320px up.
- Step-by-step progress indicators, client-side validation, drag-and-drop file uploads.
- Form Unavailable indicators for draft or closed forms.
- Success confirmation screen with optional redirect countdowns.

### Admin Console (Internal)
- Platform Overview: Global stats (users, workspaces, forms, responses, storage) and error/abuse monitors.
- System Logs: Paginated, filterable structured log viewer (info/warn/error) with expandable stack traces.
- User CRUD: Manage workspace details, suspend accounts, and hard-delete users with cascading cleanups.
- Audit Trail: Immutable record of all Admin operations.

---

## Tech Stack

- **Frontend:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Zustand · TanStack Query · React Hook Form · Zod · dnd-kit · Apache ECharts (planned, Sprint 5) · Lucide React
- **Backend:** Express.js · Node.js 20 LTS · TypeScript · Mongoose · Zod · Multer · Puppeteer · Helmet · CORS · express-rate-limit · pino
- **Database:** MongoDB Atlas (application data) · Firebase Authentication (login credentials only)
- **Authentication:** Firebase Auth login → same-origin Next.js BFF → Express JWT session → frontend-domain HttpOnly Secure cookie (`SameSite=Lax`)
- **Storage:** Current backend audit: local `/uploads`; product/deployment target: durable Cloudflare R2-compatible object storage
- **Deployment:** Vercel (Frontend — `beginso.com`) · Render / Railway / VPS (Backend — necessary for headless Puppeteer)

---

## Project Structure

This repository holds the **frontend only** — the Express/MongoDB backend lives in a separate repository and is consumed over HTTPS REST via `NEXT_PUBLIC_API_URL` (see `docs/backend-contract/api-reference.md` for the current contract).

```
Onboarding Platform/     # Next.js 16 client-side application (this repo)
├── src/
│   ├── app/           # App router pages & layouts: (auth), (user), api/
│   ├── components/    # UI components (ui/, common/, dashboard/, form-builder/, landing/, auth/, providers/)
│   ├── services/      # API integration services (auth.ts, forms.ts)
│   ├── store/         # Zustand state stores (builderStore.ts)
│   ├── lib/           # Firebase client, axios instance, schemas, auth context, helpers
│   ├── hooks/         # Shared hooks (useAuth)
│   └── types/         # Shared TypeScript types (form.ts, etc.)
├── src/proxy.ts       # Route guards; validates the HttpOnly session with the backend
├── __tests__/         # Vitest unit/property-based tests
├── e2e/               # Playwright end-to-end tests + mock backend server
├── playwright.config.ts
├── vitest.config.ts
└── .env.local         # Environment variables configuration
```

Firebase supplies the one-time identity token used at login. The Next.js BFF exchanges it for
the backend JWT, stores that JWT only in the HttpOnly `beginso_session` cookie, and forwards it
server-to-server. `src/proxy.ts` validates the session with backend `/api/auth/me`; browser
JavaScript never receives or stores the JWT.

---

## Sprint Plan & Timeline (MVP v1.0)

### Working Rhythm
- **Working Days:** Monday to Saturday (Sunday off).
- **Monday – Friday:** Development only — building core features.
- **Saturday:** Testing only — no new feature code. Manual smoke testing, API checks, cross-device testing, and bug logging.
- **Sprint Boundaries:** A sprint milestone is only marked as "done" when the Saturday test pass is green and all exit criteria are met.

### Week Overview Table (v2 — revised 8-week timeline, compressed from the original 11-week plan)

> Full week-by-week detail (day-by-day tasks, exit criteria) lives in `docs/planning/sprint-plan.md` — treat that file as authoritative; this table is a summary. See `docs/README.md` for the full documentation map.

| Wk | Sprint / Track | Focus | Status | Dates |
|:---|:---|:---|:---|:---|
| 1 | Sprint 1 | Auth + Landing + Dashboard foundation | ⚠️ **Frontend implemented; exit gate incomplete** — reset email and signed-link verification are implemented; backend `email_verified` enforcement and final/manual Kiro tasks remain | 29 Jun – 04 Jul |
| 2 | Sprint 2 (Part 1) | Form Builder core: toolbox, dnd-kit canvas, basic properties, CRUD integration | ✅ **Complete** | 06 Jul – 11 Jul |
| 3 | Sprint 2 (Part 2) | Form Builder completion: full field properties, Logic Rules, Branding, publish flow | ✅ **Implemented** · 7 manual acceptance checks remain unchecked in the Kiro task file | 13 Jul – 18 Jul |
| 4 | Sprint 3 | Public Form: SSR rendering, validation, file uploads, spam prevention | ✅ **Frontend implemented** · 41 Playwright scenarios are checked in | 20 Jul – 25 Jul |
| 5 | Super Admin (merged) | Developer console: logs, user CRUD, audit trail | **Not started** | 27 Jul – 01 Aug |
| 6 | Sprint 4 | Response Management: paginated response table, filters, submission details, status updates | ✅ **Implemented** · Saturday manual/exit gate remains unchecked | 03 Aug – 08 Aug |
| 7 | Sprint 5+6 (merged) | Analytics & Reports: ECharts integration, CSV/PDF export, Templates Gallery polish | Planned | 10 Aug – 15 Aug |
| 8 | Sprint 7+8 (merged) | Settings, Forms Manager, QA/Hardening & Launch | Planned | 17 Aug – 22 Aug |

*Note: Weeks 1–3 dates are confirmed; Weeks 4–8 are computed forward as consecutive Mon–Sat working weeks and shift together if any slips occur. MVP target: 22 Aug 2026 (down from the original 12 Sep 2026 target).*

---

## Screens Reference (24 Total)

- **Auth & Onboarding (4 Screens):** Login, Sign Up, Forgot Password, Email Verification (signed-link MVP; numeric OTP requires backend delivery/expiry/rate limiting)
- **Core User Platform (11 Screens):** Workspace Home, Forms Manager, Templates Gallery, Form Builder, Responses Hub (Table/Kanban/Calendar/Analytics), Submission Detail, Reports & Exports, Auto-Dashboard, Settings Panel, Modals & Dialogs, Feeds & Feedback
- **Design System Showcase (1 Screen):** Interactive UI Elements Showcase
- **Respondent Side (3 Screens):** Published Public Form, Form Unavailable Screen, Success Confirmation
- **Admin Console (4 Screens, Desktop-only):** Overview Dashboard, System Logs Viewer, User Management, Audit Log Viewer
- **Resource Guide (1 Screen):** Responsive Breakpoint Guide

---

## Design System & UI Guidelines

### Core Principles
- **Simple First:** Form structures, dashboards, and settings are designed to be easily understood within 5 seconds by non-technical users.
- **Human, Not AI-Generated:** High usability and warm, clean aesthetic. No glassmorphism, heavy gradients, or neon colors.
- **Status Is Unambiguous:** Badges use distinct background, border, and text colors (Active, Draft, Closed, New, In Progress, Completed).
- **Mobile-First Respondents:** All client-side submission screens are fully optimized for mobile devices. The complex Form Builder is restricted to desktop-only views.

### Typography & Colors
- **Brand Font:** Inter · **Monospace Font:** JetBrains Mono (used for IDs, logs, and audit trails).
- **Brand Color:** Slate Blue (`#1D4ED8` primary) over Slate Gray neutrals.

---

## Security & Reliability Highlights

- **Role Protection:** Backend API endpoints `/api/superadmin/*` and frontend `/superadmin/*` routes are protected by a `requireSuperAdmin` middleware checking JWT claims.
- **Access Control:** User database queries are strictly scoped using `workspaceId` extracted from verified JWT tokens.
- **User Suspension:** `blockSuspended` middleware immediately rejects suspended user accounts (returning 403 `ACCOUNT_SUSPENDED`).
- **Audit Logs:** Every Admin mutation (e.g., suspending accounts, purging data) writes a read-only record in the `audit_logs` collection.
- **Spam Protection:** Rate limiting (10 requests/IP/min per form) and a hidden honeypot field are active on public form submissions.
- **Anonymization:** IP addresses are processed into SHA-256 hashes before storage; raw IPs are never saved.
- **File Upload Security:** Multer constraints must validate file size (max 100 MB) and MIME type.
  The audited backend currently stores files on local disk; durable R2-compatible storage remains
  a deployment requirement unless the single-node storage constraint is accepted explicitly.

---

## MVP Scope

### Included
- Complete Workspace & Forms management (forms CRUD, template creation).
- Drag-and-drop Form Builder (10 field types, single-level conditional logic, branding options).
- Public form page with progress bar, validation, and drag-and-drop file uploads.
- Response Hub with data table, workflow status tracking, and ECharts dashboards.
- CSV and PDF reports export.
- Internal **Admin Console** for developer log viewing, user account suspension/CRUD, platform stats, and audit trails.

### Deferred (Post-MVP)
- Multi-user workspaces and custom user roles.
- Kanban, Calendar, and Gallery as primary response views.
- Custom dashboard builders.
- Stripe payment inputs.
- Webhook endpoints and integrations.
- Native mobile apps.

---

## Monetisation Plan

| Plan | Details |
|------|---------|
| Free | 3 forms · 100 responses/month · 100 MB storage |
| Pro | Higher limits · branding removal · priority support |
| Business | Custom domain · advanced reports · team roles (post-MVP) |
| Enterprise | SSO · compliance · SLA · dedicated support |

---

## Contributing

Branch naming in this repo: `feature/feature-name` or `bugfix/fix-name`, merged into `main` via pull request — no direct commits to `main`.
PRs require a description of what it does, how to test it, and screenshots for any frontend work.

---

## Getting Started

### Prerequisites
- **Node.js**: `20.x` LTS version or higher

### Installation & Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Create a `.env.local` file in the root of the project and populate it with the required Firebase and API environment variables:
   ```env
   # Backend API Configuration
   NEXT_PUBLIC_API_URL=http://localhost:4000

   # Firebase Client SDK Configuration
   NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
   NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
   ```

3. **Firebase Setup**:
   - Create a project on the [Firebase Console](https://console.firebase.google.com/).
   - Enable **Email/Password** and **Google** sign-in providers in the Authentication section.
   - Copy the web app configuration values and add them to `.env.local` as shown above.

### Available NPM Scripts

- `npm run dev`: Runs the Next.js development server locally.
- `npm run build`: Generates the optimized production build of the Next.js application.
- `npm run start`: Starts the Next.js production server locally after building.
- `npm run lint`: Runs ESLint to check code quality and static typing.
- `npm run type-check`: Runs `tsc --noEmit` — no build output, just verifies the whole project type-checks cleanly.
- `npm test`: Runs the Vitest unit/property-based test suite once (used in CI).
- `npm run test:watch`: Runs Vitest in watch mode — reruns affected tests as files change.
- `npm run test:e2e`: Runs the Playwright end-to-end suite headlessly against a mocked backend.
- `npm run test:e2e:ui`: Runs the same E2E suite in Playwright's interactive UI mode (step through each test, inspect the DOM/network at every point).

---

## Testing

The project has two independent layers of automated tests. Both must pass before a PR is considered done; `npm run type-check` and `npm run lint` should be clean too.

### Unit & Property Tests (Vitest)

**Location:** `__tests__/` · **Run:** `npm test` (once) or `npm run test:watch` (watch mode)

Covers pure logic in isolation — the conditional-logic engine, the dynamic Zod schema builder, file validation, the honeypot/draft-persistence helpers — plus individual components via `@testing-library/react`, and API services with `fetch` mocked at the network layer. A subset are **property-based tests** (via `fast-check`): instead of asserting one hand-picked example, they assert an invariant holds across 100 randomly generated inputs per run — e.g. "a field hidden by conditional logic is never present in the submitted answers, no matter what the rest of the form looks like."

These tests never touch a real backend or a real browser. The current suite contains 384 tests
across 59 files, including auth/security and public-form draft-storage coverage.

### End-to-End Tests (Playwright)

**Location:** `e2e/` · **Run:** `npm run test:e2e` (headless) or `npm run test:e2e:ui` (interactive)

Drives a real Chromium browser against the actual rendered public form pipeline (`/f/[slug]` and `/f/[slug]/success`) — real inputs, page navigation, validation, and file picker interactions. `playwright.config.ts` starts a dedicated Next.js dev server plus `e2e/mockServer.ts`, so the 41 checked-in scenarios do not depend on the live backend.

Test scenarios are chosen by the slug itself (e.g. `/f/mock-valid`, `/f/mock-not-found`, `/f/mock-submit-422`) — see the conventions documented at the top of `e2e/mockServer.ts`.

Current coverage (9 spec files, 41 tests): SSR rendering, accessibility basics, mobile viewport (320px), field validation for all 10 field types, multi-page navigation, conditional logic (including inspecting the real submitted payload to confirm hidden fields never appear in it), file upload (valid/oversized/disallowed-type/remove), submission outcomes (200/422/429/500 + honeypot), outage-vs-unavailable handling, the Success screen, and draft persistence.

If a spec file fails, Playwright saves a screenshot and a full trace under `test-results/` — `npx playwright show-trace <path-to-trace.zip>` opens an interactive timeline of exactly what the browser saw.

---

*MVP v1.0 · June 2026 · Confidential — Internal Use*
