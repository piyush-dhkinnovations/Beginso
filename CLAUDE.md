# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Frontend-only repo (Next.js 16 App Router, TypeScript, Tailwind v4, Zustand, TanStack Query, React Hook Form + Zod, dnd-kit). The Express/MongoDB backend lives in a **separate repository** and is consumed over REST via `NEXT_PUBLIC_API_URL` — you cannot read or run backend code from here, only document the contract it needs to implement. A separate Super Admin console (`Beginso-Admin`) and a shared cross-team documentation repo (`Beginso-Report`) also exist outside this checkout.

## Before doing non-trivial work

1. **Check [`docs/README.md`](docs/README.md) first** — it maps every kind of doc update ("adding a sprint", "telling the backend dev about an API change", "recording a bug") to the one correct file. Do not create a new ad hoc markdown file without checking it — there is almost always an existing canonical file this belongs in.
2. **Invoke the `beginso-frontend-guide` skill** before implementing any non-trivial frontend feature — it holds verified architecture, auth flow, builder-state, styling, and component reference that's cheaper to load once than to re-derive by re-reading the whole codebase.

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

Run a single Vitest file or test by path/name (standard Vitest CLI, not a package.json alias):
```bash
npx vitest run __tests__/path/to/File.test.tsx
npx vitest run -t "test name substring"
```
Test files live under `__tests__/`, mirroring `src/`'s structure; the glob is
`**/__tests__/**/*.{test,spec}.{ts,tsx}` (see `vitest.config.ts`). A PR/change isn't done until
`type-check`, `lint`, `test`, and `build` are all clean — this project runs all four before
reporting work finished, not just the one being actively edited.

## Architecture

- **Auth is a three-hop chain, and browser JS never sees the real session token.** Firebase client
  SDK authenticates the user → the app's own same-origin BFF (`src/app/api/backend/[...path]/route.ts`)
  exchanges that for the backend's JWT and writes it to an HttpOnly `beginso_session` cookie →
  every subsequent API call goes browser → BFF → backend, cookie-authenticated. `src/proxy.ts`
  (Edge middleware) only checks that a valid session exists for protected routes; per-user gating
  (e.g. onboarding-incomplete redirects) is deliberately handled client-side in
  `src/lib/authContext.tsx`, not in middleware, to avoid needing JWT claims or an extra edge-layer
  backend call. `AuthContext`'s `login()` is the single chokepoint every auth entry point
  (signup, login, email-verify) funnels through before navigating past auth pages.
- **The BFF proxy has a hardcoded path allowlist** (`ALLOWED_API_ROOTS` in
  `src/app/api/backend/[...path]/route.ts`). A new backend domain (e.g. a new `/api/notifications/*`
  surface) needs its root added here or every call 404s with `"Backend path is not allowed"` even
  though the real backend already implements it — a recurring, easy-to-misdiagnose trap.
- **Service-layer responses are defensively unwrapped, not trusted as documented.** The backend's
  response envelopes have historically been inconsistent (`{ data: ... }`, `{ namedKey: ... }`, or
  bare), so most files under `src/services/` adapt the raw response through a small
  `unwrapEnvelope()`-style helper (see `settings.ts`, `responses.ts`, `analytics.ts`, `reports.ts`)
  rather than assuming the contract doc's shape is exactly what's live. Follow this pattern for any
  new service rather than trusting a shape that hasn't been exercised against the real backend.
- **The Form Builder's only source of truth is the Zustand `builderStore`** (`src/store/builderStore.ts`)
  — snapshot-based undo/redo (50-entry cap), autosave debounce, and every field/page mutation goes
  through it. Never mutate builder state outside this store.
- **Settings tabs stay mounted once visited, not conditionally unmounted.** `src/app/(user)/settings/page.tsx`
  keeps every visited tab in the DOM (CSS `hidden`, not JSX-omitted) via a `visitedTabs` set — the
  naive `{activeTab === 'x' && <XTab/>}` pattern was found to silently drop unsaved edits on tab
  switch. Reuse this pattern for any new tabbed surface that holds local form state.
- **Container queries, not media queries, for components reused at different available widths.**
  `BrandingPanel` (shared between the Form Builder and Settings) uses `@container` breakpoints
  because its two parents give it genuinely different widths at the same viewport size — a media
  query would size it off the wrong box.

## Key facts worth remembering

- Backend API contract changes go in `docs/backend-contract/api-reference.md` — that file is what the backend developer actually implements against. Update it whenever a frontend change needs a new/changed endpoint.
- `docs/planning/sprint-plan.md` is the one canonical timeline. Don't create a second one.
- `docs/status/implementation-status.md` is regenerated from code state, never hand-edited.
- `.kiro/specs/<sprint-name>/` holds Kiro-IDE-managed day-by-day task specs — don't move or duplicate these into `docs/`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
