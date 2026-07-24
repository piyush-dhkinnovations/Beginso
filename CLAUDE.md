# Beginso — instructions for Claude Code

Frontend-only repo (Next.js 16 App Router, TypeScript, Tailwind v4, Zustand, TanStack Query, React Hook Form + Zod, dnd-kit). The Express/MongoDB backend lives in a **separate repository** and is consumed over REST via `NEXT_PUBLIC_API_URL` — you cannot read or run backend code from here, only document the contract it needs to implement.

## Before doing non-trivial work

1. **Check [`docs/README.md`](docs/README.md) first** — it maps every kind of doc update ("adding a sprint", "telling the backend dev about an API change", "recording a bug") to the one correct file. Do not create a new ad hoc markdown file without checking it — there is almost always an existing canonical file this belongs in.
2. **Invoke the `beginso-frontend-guide` skill** before implementing any non-trivial frontend feature — it holds verified architecture, auth flow, builder-state, styling, and component reference that's cheaper to load once than to re-derive by re-reading the whole codebase.
3. Read `.agents/AGENTS.md` for the project's lazy-dev/ponytail coding rules (YAGNI, reuse before building, no speculative abstractions).

## Key facts worth remembering

- Backend API contract changes go in `docs/backend-contract/api-reference.md` — that file is what the backend developer actually implements against. Update it whenever a frontend change needs a new/changed endpoint.
- `docs/planning/sprint-plan.md` is the one canonical timeline. Don't create a second one.
- `docs/status/implementation-status.md` is regenerated from code state, never hand-edited.
- `.kiro/specs/<sprint-name>/` holds Kiro-IDE-managed day-by-day task specs — don't move or duplicate these into `docs/`.
