# Beginso

A web-based form management platform that goes beyond just collecting responses. Beginso lets admins create forms, share them publicly, manage incoming submissions with status tracking, and view auto-generated dashboards — all in one place, without a spreadsheet in sight.

---

## What Is This?

Most form tools stop at collection. Beginso picks up where they leave off.

After a response comes in, the admin can track it through a workflow (New → In Progress → Completed), view a dashboard that builds itself automatically, and export reports as CSV or PDF — all inside the same product. The goal is to make post-submission work as smooth as the collection itself, for users with zero technical background.

---

## User Roles

| Role | Target Users | Authentication | Core Functions |
|:---|:---|:---|:---|
| **Admin** | Small businesses, freelancers, educators, recruiters, event organisers, NGOs | Firebase Authentication (Email/Password or Google) | Creates forms, configures branding/logic, tracks response statuses, views dashboard, exports reports |
| **Respondent** | Anyone with the shared form link | No login required | Fills public forms, uploads files, submits responses |
| **Super Admin** | Platform developers & operators | Firebase Auth + manual DB role flag | Internal operations: monitors logs, manages admin accounts, tracks usage, audit trail |

---

## Core User Flow

```
Admin creates form → Publishes & shares link
     ↓
Respondent submits → Files upload to Cloudflare R2
     ↓
Admin reviews responses → Tracks status (New → In Progress → Completed) → Views auto-dashboard
     ↓
Admin exports CSV or PDF report
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

### Super Admin Console (Internal)
- Platform Overview: Global stats (admins, workspaces, forms, responses, storage) and error/abuse monitors.
- System Logs: Paginated, filterable structured log viewer (info/warn/error) with expandable stack traces.
- Admin CRUD: Manage workspace details, suspend accounts, and hard-delete admins with cascading cleanups.
- Audit Trail: Immutable record of all Super Admin operations.

---

## Tech Stack

- **Frontend:** Next.js 15 (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Zustand · TanStack Query · React Hook Form · Zod · dnd-kit · Apache ECharts · Lucide React
- **Backend:** Express.js · Node.js 20 LTS · TypeScript · Mongoose · Zod · Multer · Puppeteer · Helmet · CORS · express-rate-limit · pino
- **Database:** MongoDB Atlas (application data) · Firebase Authentication (login credentials only)
- **Authentication:** Firebase Auth login → Express JWT session → HttpOnly Secure cookie (`SameSite=Strict`)
- **Storage:** Cloudflare R2 (permanent file storage) · Local `/uploads` (temporary staging)
- **Deployment:** Vercel (Frontend) · Render / Railway / VPS (Backend — necessary for headless Puppeteer)

---

## Project Structure

```
Beginso-platform/
├── frontend/             # Next.js 15 client-side application
│   ├── src/
│   │   ├── app/          # App router pages & layouts (auth, admin, superadmin, f/)
│   │   ├── components/   # UI components (ui/, layout/, form-builder/, charts/, superadmin/)
│   │   ├── services/     # API integration services (auth, forms, responses, superadmin, etc.)
│   │   ├── store/        # Zustand state stores (auth, builder, workspace)
│   │   └── middleware.ts # Edge routing middleware (admin & superadmin route guards)
│   └── .env.local        # Environment variables configuration
└── backend/              # Express.js REST API
    ├── src/
    │   ├── routes/       # API route definitions
    │   ├── controllers/  # Request parsing & response handling
    │   ├── services/     # Core business logic (auth, form builder, superadmin, etc.)
    │   ├── repositories/ # Workspace-scoped database queries
    │   ├── models/       # Mongoose schemas (User, Workspace, Form, Response, AuditLog, etc.)
    │   └── middleware/   # Custom middlewares (auth validation, superadmin guard, suspend checker)
    └── server.ts         # Server bootstrap
```

The frontend and backend communicate exclusively over HTTPS REST APIs. Authentication is verified through Firebase, which issues a JWT stored in an HttpOnly cookie.

---

## Sprint Plan & Timeline (MVP v1.0)

### Working Rhythm
- **Working Days:** Monday to Saturday (Sunday off).
- **Monday – Friday:** Development only — building core features.
- **Saturday:** Testing only — no new feature code. Manual smoke testing, API checks, cross-device testing, and bug logging.
- **Sprint Boundaries:** A sprint milestone is only marked as "done" when the Saturday test pass is green and all exit criteria are met.

### Sprint Overview Table

| Sprint | Focus | Duration | Status | Dates |
|:---|:---|:---|:---|:---|
| **Sprint 1** | Auth + Landing + Dashboard foundation | 7 Days | ✅ **Complete** | 29 Jun – 04 Jul |
| **Sprint 2 (Part 1)** | Form Builder core: toolbox, dnd-kit canvas, basic properties, CRUD integration | 6 Days | Next | 06 Jul – 11 Jul |
| **Sprint 2 (Part 2)** | Form Builder completion: full field properties, Logic Rules, Branding, publish flow | 6 Days | Planned | 13 Jul – 18 Jul |
| **Sprint 3** | Public Form: SSR rendering, validation, Cloudflare R2 file uploads, spam prevention | 7–10 Days | Planned | 20 Jul – 30 Jul |
| **Sprint 4** | Response Management: paginated response table, filters, submission details, status updates | 7–10 Days | Planned | 31 Jul – 11 Aug |
| **Sprint 5** | Analytics Dashboard: ECharts integration, stats, workspace analytics | 5–7 Days | Planned | 12 Aug – 19 Aug |
| **Sprint 6** | Reports & Templates: CSV/PDF export generation, Templates Gallery | 5–7 Days | Planned | 20 Aug – 27 Aug |
| **Sprint 7** | Settings & Forms Manager: profile, workspace branding, form actions | 5–7 Days | Planned | 28 Aug – 04 Sep |
| **Sprint 8** | QA, Hardening & Launch: smoke tests, performance/accessibility audit, production deploy | 5–7 Days | Planned | 05 Sep – 12 Sep |

*Note: Sprints assume a start date of Monday 06 July 2026 for Sprint 2 and shift together if any slips occur.*

### Parallel Tracks
- **Backend Track (Sprints 2–5):** Express API, MongoDB repository scoping, Zod schemas, Bruno testing collection, and Property-Based Testing (PBT) coverage.
- **Super Admin Track (starts post-Sprint 2):** Developer console, structured system log viewer, admin account CRUD, account suspension checks, cascading hard-deletes, and audit logging. Scheduled for Mon 20 Jul – Tue 11 Aug.

---

## Screens Reference (24 Total)

- **Auth & Onboarding (4 Screens):** Login, Sign Up, Forgot Password, OTP Verification
- **Core Admin Platform (11 Screens):** Workspace Home, Forms Manager, Templates Gallery, Form Builder, Responses Hub (Table/Kanban/Calendar/Analytics), Submission Detail, Reports & Exports, Auto-Dashboard, Settings Panel, Modals & Dialogs, Feeds & Feedback
- **Design System Showcase (1 Screen):** Interactive UI Elements Showcase
- **Respondent Side (3 Screens):** Published Public Form, Form Unavailable Screen, Success Confirmation
- **Super Admin Console (4 Screens, Desktop-only):** Overview Dashboard, System Logs Viewer, Admin User Management, Audit Log Viewer
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
- **Admin Suspension:** `blockSuspended` middleware immediately rejects suspended admin accounts (returning 403 `ACCOUNT_SUSPENDED`).
- **Audit Logs:** Every Super Admin mutation (e.g., suspending accounts, purging data) writes a read-only record in the `audit_logs` collection.
- **Spam Protection:** Rate limiting (10 requests/IP/min per form) and a hidden honeypot field are active on public form submissions.
- **Anonymization:** IP addresses are processed into SHA-256 hashes before storage; raw IPs are never saved.
- **File Upload Security:** Multer constraints validate file sizes (max 100 MB) and MIME types before sending files to Cloudflare R2 storage. Temporary uploads in `/uploads` are purged hourly.

---

## MVP Scope

### Included
- Complete Workspace & Forms management (forms CRUD, template creation).
- Drag-and-drop Form Builder (10 field types, single-level conditional logic, branding options).
- Public form page with progress bar, validation, and drag-and-drop file uploads.
- Response Hub with data table, workflow status tracking, and ECharts dashboards.
- CSV and PDF reports export.
- Internal **Super Admin Console** for developer log viewing, admin account suspension/CRUD, platform stats, and audit trails.

### Deferred (Post-MVP)
- Multi-admin workspaces and custom user roles.
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

Branch naming: `fe/feature-name` for frontend, `be/feature-name` for backend.
All changes go through pull requests — no direct commits to `main`.
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
   NEXT_PUBLIC_USE_MOCK=true

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

---

*MVP v1.0 · June 2026 · Confidential — Internal Use*
