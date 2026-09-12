# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Frontend-only repo (Next.js 16 App Router, TypeScript, Tailwind v4, Zustand, TanStack Query, React Hook Form + Zod, dnd-kit). The Express/MongoDB backend lives in a **separate repository** and is consumed over REST via `NEXT_PUBLIC_API_URL` — you cannot read or run backend code from here, only document the contract it needs to implement. A separate Super Admin console (`Beginso-Admin`) and a shared cross-team documentation repo (`Beginso-Report`) also exist outside this checkout.

---

## Before doing non-trivial work

**Check [`docs/README.md`](docs/README.md) first.** It maps every kind of doc update — "adding a sprint", "telling the backend dev about an API change", "recording a bug" — to the one correct file. Do not create a new ad hoc markdown file without checking it; there is almost always an existing canonical file this belongs in.

---

## Skills

Three skills live in `.claude/skills/`. Each is also a slash command.

| Skill | Use it when | What it does |
|---|---|---|
| **`/sprint`** | Starting a new sprint | Reads `Beginso-Report/Beginso-V2/`, inspects this repo, writes `requirements.md`, `design.md` and `tasks.md` into `.kiro/specs/sprint-<n>-<name>/` |
| **`/day`** | Starting a day inside a sprint | Reads all three spec files, verifies the previous day's tasks **against the code**, works today's tasks, marks them complete with evidence |
| **`/docs`** | After work has shipped | Updates the shared documentation in `Beginso-Report` from verified git evidence |

### Rules that apply to all three

- **Code is the evidence, not a checkbox and not a conversation.** `/day` unticks any task whose acceptance criteria are not actually met. `/docs` marks something `NEEDS VERIFICATION` rather than `COMPLETED` when the diff does not prove it.
- **`/sprint` and `/day` write only to `.kiro/specs/`.** They never edit `Beginso-Report`.
- **`/docs` never edits `Beginso-Report/Beginso-V2/` or `Beginso-V1-MVP/`.** Planning documents change by a deliberate version bump, not as a side effect of shipping code.
- None of them commit or push.

`/day` needs `Beginso-Report` open in the workspace to read the sprint plan's day rows. A multi-root workspace with both repos is the intended setup.

---

## Commands

```bash
npm run dev          # Next.js dev server (localhost:3000)
npm run build        # production build (also type-checks)
npm run lint         # ESLint over the whole repo
npm run type-check   # tsc --noEmit, no build output
npm test             # vitest run — full unit/property-based suite, once
npm run test:watch   # vitest, watch mode
npm run test:e2e     # Playwright, headless, against a mocked backend (port 3100)
npm run test:e2e:ui  # Playwright, interactive UI mode
```

Run a single Vitest file or test by path or name — standard Vitest CLI, not a `package.json` alias:

```bash
npx vitest run __tests__/path/to/File.test.tsx
npx vitest run -t "test name substring"
```

Test files live under `__tests__/`, mirroring `src/`'s structure; the glob is `**/__tests__/**/*.{test,spec}.{ts,tsx}` (see `vitest.config.ts`).

**A change is not done until `type-check`, `lint`, `test` and `build` are all clean.** This project runs all four before reporting work finished, not just the one being actively edited.

---

## Architecture

**Auth is a three-hop chain, and browser JS never sees the real session token.** Firebase client SDK authenticates the user → the app's own same-origin BFF (`src/app/api/backend/[...path]/route.ts`) exchanges that for the backend's JWT and writes it to an HttpOnly `beginso_session` cookie → every subsequent API call goes browser → BFF → backend, cookie-authenticated. `src/proxy.ts` (Edge middleware) only checks that a valid session exists for protected routes; per-user gating such as onboarding-incomplete redirects is deliberately handled client-side in `src/lib/authContext.tsx`, not in middleware, to avoid needing JWT claims or an extra edge-layer backend call. `AuthContext`'s `login()` is the single chokepoint every auth entry point — signup, login, email-verify — funnels through before navigating past auth pages.

**The BFF proxy has a hardcoded path allowlist** (`ALLOWED_API_ROOTS` in `src/app/api/backend/[...path]/route.ts`). A new backend domain — a new `/api/notifications/*` surface, for example — needs its root added here or every call 404s with `"Backend path is not allowed"` even though the real backend already implements it. A recurring, easy-to-misdiagnose trap.

**Service-layer responses are defensively unwrapped, not trusted as documented.** The backend's response envelopes have historically been inconsistent — `{ data: ... }`, `{ namedKey: ... }`, or bare — so most files under `src/services/` adapt the raw response through a small `unwrapEnvelope()`-style helper (see `settings.ts`, `responses.ts`, `analytics.ts`, `reports.ts`) rather than assuming the contract doc's shape is what is live. Follow this pattern for any new service rather than trusting a shape that has not been exercised against the real backend.

**The Form Builder's only source of truth is the Zustand `builderStore`** (`src/store/builderStore.ts`) — snapshot-based undo/redo with a 50-entry cap, autosave debounce, and every field and page mutation goes through it. Never mutate builder state outside this store.

**Settings tabs stay mounted once visited, not conditionally unmounted.** `src/app/(user)/settings/page.tsx` keeps every visited tab in the DOM via a `visitedTabs` set and CSS `hidden`, not JSX omission — the naive `{activeTab === 'x' && <XTab/>}` pattern was found to silently drop unsaved edits on tab switch. Reuse this pattern for any new tabbed surface holding local form state.

**Container queries, not media queries, for components reused at different available widths.** `BrandingPanel`, shared between the Form Builder and Settings, uses `@container` breakpoints because its two parents give it genuinely different widths at the same viewport size — a media query would size it off the wrong box.

---

## V2 conventions — apply from Sprint 7 onward

**Screens import from `components/ui/`, never a raw class name.** The V2 design system is a CSS library (`beginso-ui.css`, in `Beginso-Report/Beginso-Design-System/Beginso V2/`) wrapped by a `components/ui/` package built in Sprint 7. A screen that writes `class="bg-btn bg-btn-primary"` directly bypasses the wrapper and makes a later token change unsafe.

**Every screen is built in both themes from the first commit.** Dark mode is a token swap — the default palette is Slate, with `midnight` and `dimmed` available via `data-dark`. Retro-fitting dark at the end means re-testing everything twice.

**The theme preference is read server-side and written into the initial HTML.** Otherwise every dark-mode user gets a white flash on every page load.

**Permission checks belong on the server.** Hiding UI is not authorization. A frontend gate is a convenience; the corresponding backend requirement must be recorded in the spec.

**Pages never set their own width.** `AppShell` owns the content container —
48px horizontal padding at ≥1280, 32px at tablet, 16px on mobile, 64px
bottom, max-width 1600px. A page component returns its content directly and
sets no `max-w-`, `mx-auto` or `container` class.

The only narrow columns permitted: a settings-style **form** at 640px, an
empty-state **paragraph** at 42ch, and long-form **prose** at 65ch. Constrain
content that is hard to read wide — never the page.

**Every page uses `PageHeader`** from `components/ui/`. No hand-rolled page
titles.

---

## Key facts worth remembering

**Two sprint plans exist, and only one is current.**
- `Beginso-Report/Beginso-V2/SPRINT-PLAN.md` — **current.** 8 weeks, V2a then V2b.
- `docs/planning/sprint-plan.md` — the finished MVP plan. Historical. Do not add to it.

**Sprint numbers are continuous across the product.** The MVP ran sprints 1–6. V2 runs sprints **7–14**. The V2 plan is written in *weeks* 1–8, which are timeline positions, not sprint numbers. Week 1 is Sprint 7. Never use a week number in a folder name, and never create `sprint-1-*` — that number is taken.

**`.kiro/specs/<sprint-name>/` holds the day-by-day task specs**, generated by `/sprint` and consumed by `/day`. Do not move or duplicate them into `docs/`. MVP spec folders (`sprint-1-frontend-auth` through `sprint-6-settings`, plus `super-admin-console`) are the record of what was built — never modified or renamed.

**Backend API contract changes go in `docs/backend-contract/api-reference.md`.** That file is what the backend developer implements against. Update it whenever a frontend change needs a new or changed endpoint. The cross-project version is `Beginso-Report/API_CONTRACT.md`; if the two disagree, verify against live code and update the owning document rather than copying the fix into both.

**`docs/status/implementation-status.md` is regenerated from code state, never hand-edited.**

---

## Where documentation lives

| What | Where |
|---|---|
| This repo's own docs map | `docs/README.md` |
| Backend contract the BE dev implements against | `docs/backend-contract/api-reference.md` |
| Sprint task specs | `.kiro/specs/sprint-<n>-<name>/` |
| **What V2 contains** — features, decisions, release split | `Beginso-Report/Beginso-V2/MASTER-FEATURE-LIST_v*.md` |
| **The current sprint plan** | `Beginso-Report/Beginso-V2/SPRINT-PLAN.md` |
| Decisions to close before Sprint 7 | `Beginso-Report/Beginso-V2/PRE-SPRINT-TASKS.md` |
| Cross-project status, contract, changelog | `Beginso-Report/PROJECT_STATUS.md` · `API_CONTRACT.md` · `CHANGELOG.md` |
| Design system | `Beginso-Report/Beginso-Design-System/Beginso V2/` |
| MVP history — read-only | `Beginso-Report/Beginso-V1-MVP/` |

**Never plan from `Beginso-V1-MVP/`.** It tells you what exists. It never tells you what to build.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
