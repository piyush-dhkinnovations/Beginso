# Ongoing Platform

A web-based form management platform that goes beyond just collecting responses. Ongoing Platform lets admins create forms, share them publicly, manage incoming submissions with status tracking, and view auto-generated dashboards — all in one place, without a spreadsheet in sight.

---

## What Is This?

Most form tools stop at collection. Ongoing Platform picks up where they leave off.

After a response comes in, the admin can track it through a workflow (New → In Progress → Completed), view a dashboard that builds itself automatically, and export reports as CSV or PDF — all inside the same product. The goal is to make post-submission work as smooth as the collection itself, for users with zero technical background.

---

## Who It's For

| Role | Description |
|------|-------------|
| **Admin** | Small businesses, freelancers, educators, recruiters, event organisers, NGOs — anyone who needs to collect and act on structured data |
| **Respondent** | Anyone with the shared form link. No account, no login required |

---

## Core User Flow

```
Admin creates form → Publishes & shares link
     ↓
Respondent submits → Files upload to cloud storage
     ↓
Admin reviews responses → Tracks status → Views auto-dashboard
     ↓
Admin exports CSV or PDF report
```

---

## Key Features

### Form Builder
- Drag-and-drop canvas with 10 field types: Short Text, Long Text, Email, Phone, Number, Date, Dropdown, Multiple Choice, Checkbox, and File Upload
- Single-level conditional logic (IF field A is value → SHOW/HIDE field B)
- Per-form branding: logo, cover image, primary colour
- Publish with a unique shareable link, embed code, and QR code

### Response Management
- Response table with search, status filter, and bulk actions
- Kanban, Calendar, and Analytics views alongside the default table
- Per-submission detail view with all answers, file states, and anonymised metadata
- Status workflow: New → In Progress → Completed

### Auto-Dashboard
- Appears automatically after the first submission — zero setup required
- Stat cards, response trend chart, status distribution, and per-question visualisations
- Date range filtering

### Reports & Exports
- CSV export (streaming) for all responses on a form
- PDF report generated via headless Chromium (Puppeteer)

### Public Form Experience
- Works on every device from 320px wide
- Progress bar, client-side validation, file upload with drag-and-drop
- Form Unavailable screen for draft/closed forms
- Success screen with optional redirect countdown

---

## Tech Stack

**Frontend**
Next.js 15 · TypeScript · Tailwind CSS · shadcn/ui · Zustand · TanStack Query · Apache ECharts · dnd-kit · Lucide React

**Backend**
Express.js · Node.js · TypeScript · Mongoose · Zod · Multer · Puppeteer

**Database & Auth**
MongoDB Atlas (application data) · Firebase Authentication (login credentials)

**Storage**
Cloudflare R2 (permanent file storage) · Local `/uploads` (temporary, pre-upload)

**Deployment**
Frontend → Vercel · Backend → Render / Railway / VPS

---

## Project Structure

```
ongoing-platform/
├── frontend/       # Next.js app — UI, routing, state, API calls
└── backend/        # Express API — auth, business logic, DB, file handling
```

The two sides communicate exclusively over HTTPS REST APIs. Auth is handled through Firebase (login) → Express JWT session → HttpOnly cookie.

---

## Development Phases (30-Day MVP)

| Phase | Days | Focus |
|-------|------|-------|
| Phase 1 — Foundation | 1–7 | Express setup, auth flow, MongoDB, base UI shell |
| Phase 2 — Form Builder | 8–14 | Form CRUD, drag-and-drop builder, templates, publish flow |
| Phase 3 — Public Form & Submissions | 15–21 | Public form page, submission handling, response table & detail |
| Phase 4 — Dashboard, Exports & Polish | 22–30 | Analytics, PDF/CSV export, settings, mobile pass, smoke tests |

---

## Screens (20 Total)

**Auth & Onboarding** — Login, Sign Up, Forgot Password, OTP Verification

**Admin Platform** — Workspace Home, Forms Manager, Templates Gallery, Form Builder, Responses Hub, Submission Detail, Reports & Exports, Auto-Dashboard, Settings, Modals & Dialogs, Feeds & Feedback, Design System Elements

**Respondent Side** — Public Form, Form Unavailable, Success Confirmation

---

## Design System

- **Primary font:** Inter · **Mono font:** JetBrains Mono
- **Brand colour:** Slate Blue (`#1D4ED8` primary)
- **Base spacing unit:** 4px
- **Icons:** Lucide React (outline, 1.5px stroke)
- **Breakpoints:** Desktop `>880px` · Tablet `521–880px` · Mobile `≤520px`
- Form builder is explicitly **desktop-only** — a friendly message is shown on mobile

Status badges are a core UI primitive. Every form and response has an unambiguous visual status — Active, Draft, Closed, New, In Progress, Completed — each with distinct background, border, and text colours.

---

## Security Highlights

- Firebase ID token verified server-side on every login — never stored
- JWT session stored in HttpOnly + Secure + SameSite=Strict cookie only
- Every database query scoped to `workspaceId` from the verified JWT — never from request body
- Rate limiting on the public submission endpoint (10 per IP per minute per form)
- Honeypot field on every form submission — bots are silently rejected
- Raw IP addresses are never stored — only a truncated SHA-256 hash
- File uploads restricted by MIME type allowlist and 100 MB size limit

---

## MVP Scope

**Included:** Auth, form builder (10 fields), conditional logic, branding, public form, file uploads, response management, status tracking, auto-dashboard, CSV + PDF export, settings, toast system, empty states, mobile responsiveness.

**Deferred post-MVP:** Team roles, Stripe payments, AI features, webhooks/integrations, mobile app, public API, self-hosting, advanced analytics.

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

*MVP v1.0 · June 2026 · Confidential — Internal Use*