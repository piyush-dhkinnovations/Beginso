# Comments report: frontend (Step 0, report only)

Base: `origin/develop` at `9a79333`. No code or comment has been changed.

## 1. Result

- **4896 comments** on 10130 lines, in 1129 of 1381 code files.
- **Stale comments are well under the 10% limit:** about 3% (7 of a 250-comment random sample; the true figure is likely under 6%).
- **Work is stopped anyway, because four groups need a decision** (section 6).
- Commented-out code: none found.

## 2. How this was counted

- Comments were read with the TypeScript parser, so `//` inside a string, URL or JSX text is not counted.
- Consecutive full-line `//` comments count as one comment.
- Covered: tracked `.ts`, `.tsx`, `.js`, `.mjs` files. Left out: `public/`, `next-env.d.ts`, the two `*.generated.ts` files. CSS comments are not counted (the proof method cannot check CSS).
- "Restating", "stale" and "history" need a person's judgement. They are **estimates** from a seeded random sample of 250 comments, plus pattern searches. Only the comments in section 5 were checked one by one.

## 3. Counts

### By form (exact)

| Form | Comments | Lines |
|---|---|---|
| JSDoc blocks (`/** */`) | 1695 | 4172 |
| Plain comments | 2928 | 5536 |
| Section headings with decoration | 170 | 305 |
| Directives | 90 | 90 |
| Flagged as commented-out code | 11 | 21 |
| TODO / FIXME | 2 | 6 |
| Empty | 0 | 0 |

All 11 "commented-out code" flags were read: each is an explanation or an API shape written as documentation, not old code.

### By kind of problem

| Kind | Comments | Share | How measured | Proposed action |
|---|---|---|---|---|
| Commented-out code | 0 | 0% | all flags read | none |
| Restating the code | about 100 to 230 | 2 to 5% | sample (5 clear, 7 borderline of 250) | remove the clear ones |
| Stale or misleading | about 150 | about 3% | sample (7 of 250) and searches | remove or fix one line |
| History only (sprint or task label, "removed X", no reason given) | about 100 | about 2% | sample; 66 are bare labels | remove |
| Useful reason that also carries a sprint, task or spec label | 703 | 14.4% | pattern search | **question 1** |
| Section headings with decoration | 170 | 3.5% | pattern search | **question 2** |
| "Contract to confirm" / "not yet built" | 56 | 1.1% | pattern search | **question 3** |
| Same text in more than one place | 91 (43 texts) | 1.9% | exact match | **question 4** |
| Pure rule lines inside a comment | 6 | 0.1% | pattern search | remove |

The rows overlap, so they do not add up to the total. 79 comments cite a QA finding id.

### By folder

| Folder | Comments | Lines |
|---|---|---|
| `src/lib` | 592 | 1271 |
| `__tests__/components` | 503 | 1145 |
| `src/components/responses` | 378 | 712 |
| `src/components/form-builder` | 361 | 561 |
| `src/types` | 333 | 545 |
| `e2e` | 291 | 497 |
| `src/components/ui` | 255 | 446 |
| `src/components/analytics` | 214 | 327 |
| `src/components/public-form` | 193 | 339 |
| `src/services` | 157 | 524 |
| `__tests__/lib` | 147 | 381 |
| `src/hooks` | 124 | 334 |
| `src/components/settings` | 112 | 223 |
| `__tests__/app` | 105 | 265 |
| `src/components/forms` | 94 | 152 |
| `shared` | 93 | 236 |
| `src/app/(user)` | 78 | 166 |
| `src/components/workspaces` | 66 | 204 |
| `src/components/dashboard-grid` | 62 | 81 |
| `src/store` | 51 | 81 |
| `__tests__/services` | 47 | 166 |
| `src/app/w` | 45 | 133 |
| `__tests__/store` | 44 | 44 |
| `src/components/templates` | 35 | 70 |
| `src/app/api` | 33 | 101 |
| `src/components/reports` | 33 | 83 |
| `src/components/landing` | 31 | 54 |
| `(root files)` | 28 | 65 |
| `src/components/team` | 28 | 83 |
| `src/components/dev` | 25 | 41 |
| `src/components/auth` | 24 | 38 |
| `src/app/try` | 20 | 27 |
| `scripts` | 18 | 48 |
| `src/app/discover-templates` | 18 | 36 |
| `src/components/guest` | 18 | 30 |
| `src/components/flow` | 16 | 28 |
| `src/components/search` | 16 | 22 |
| `__tests__/hooks` | 15 | 30 |
| `__tests__ (root files)` | 14 | 28 |
| `src/components/dashboard` | 14 | 20 |
| `src/app (root files)` | 13 | 56 |
| `src/app/onboarding` | 12 | 16 |
| `src/components/trash` | 12 | 18 |
| `src/app/(standalone)` | 11 | 25 |
| `src/app/f` | 11 | 24 |
| `src/app/(auth)` | 10 | 18 |
| `__tests__/qa` | 9 | 55 |
| `__tests__/responses` | 9 | 29 |
| `__tests__/settings` | 9 | 63 |
| `src/components/scoring` | 8 | 27 |
| `src/components/notifications` | 7 | 11 |
| `src/app/dev` | 6 | 9 |
| `src/app/invite` | 6 | 32 |
| `src/components/preview` | 6 | 12 |
| `src/app/r` | 5 | 8 |
| `src/app/blog` | 4 | 10 |
| `src/components/illustrations` | 4 | 8 |
| `src/components/respondent` | 4 | 7 |
| `src (root files)` | 4 | 10 |
| `__tests__/analytics` | 3 | 14 |
| `__tests__/reports` | 3 | 12 |
| `src/components/errors` | 3 | 5 |
| `src/components/providers` | 3 | 12 |
| `__tests__/fixtures` | 1 | 5 |
| `__tests__/scripts` | 1 | 6 |
| `src/components/policy` | 1 | 1 |

### 20 files with the most comments

| File | Comments | Comment lines | File lines |
|---|---|---|---|
| `src/types/form.ts` | 133 | 164 | 477 |
| `src/components/public-form/PublicFormShell.tsx` | 54 | 101 | 736 |
| `src/lib/formTheme.ts` | 48 | 68 | 560 |
| `__tests__/store/builderStore.test.ts` | 42 | 42 | 452 |
| `src/store/builderStore.ts` | 42 | 69 | 721 |
| `src/types/response.ts` | 42 | 67 | 202 |
| `shared/types/charts-v2.ts` | 41 | 74 | 152 |
| `src/lib/chartBuilder.ts` | 40 | 43 | 388 |
| `shared/types/insights-search-notifications.ts` | 36 | 96 | 212 |
| `__tests__/components/responses/ResponseDrawer.test.tsx` | 35 | 71 | 896 |
| `src/components/form-builder/BrandingPanel.tsx` | 33 | 53 | 621 |
| `src/components/responses/ResponseDrawer.tsx` | 32 | 70 | 681 |
| `src/components/form-builder/LookControls.tsx` | 29 | 33 | 702 |
| `src/components/form-builder/useBuilderAutosave.ts` | 28 | 47 | 303 |
| `src/components/form-builder/BrandingStudio.tsx` | 27 | 34 | 576 |
| `src/components/analytics/AnalyticsView.tsx` | 26 | 42 | 509 |
| `src/lib/authContext.tsx` | 24 | 69 | 267 |
| `src/components/responses/ResponsesTable.tsx` | 23 | 28 | 288 |
| `e2e/mockServer.ts` | 21 | 49 | 306 |
| `src/lib/queryKeys.ts` | 21 | 68 | 242 |

## 4. Directives and TODOs

90 directives. No `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck` or `prettier-ignore` exists. All will be kept.

### Disable comments with no reason on or just above them (19)

- `src/app/(standalone)/forms/claim/page.tsx:107`: `eslint-disable-line react-hooks/exhaustive-deps`
- `src/components/auth/LoginForm.tsx:48`: `eslint-disable-next-line react-hooks/set-state-in-effect`
- `src/components/auth/LoginForm.tsx:146`: `eslint-disable-next-line react-hooks/refs`
- `src/components/form-builder/useBuilderLeaveGuard.ts:25`: `eslint-disable-next-line react-hooks/set-state-in-effect`
- `src/components/forms/OwnerMonogram.tsx:38`: `eslint-disable-next-line @next/next/no-img-element`
- `src/components/landing/AuthorAvatar.tsx:13`: `eslint-disable-next-line @next/next/no-img-element`
- `src/components/landing/BlogCard.tsx:27`: `eslint-disable-next-line @next/next/no-img-element`
- `src/components/landing/ProductMockup.tsx:307`: `eslint-disable-next-line @next/next/no-img-element`
- `src/components/landing/ProductMockup.tsx:309`: `eslint-disable-next-line @next/next/no-img-element`
- `src/components/landing/Wordmark.tsx:14`: `eslint-disable-next-line @next/next/no-img-element`
- `src/components/landing/Wordmark.tsx:27`: `eslint-disable-next-line @next/next/no-img-element`
- `src/components/landing/Wordmark.tsx:29`: `eslint-disable-next-line @next/next/no-img-element`
- `src/components/responses/ResponseDrawer.tsx:352`: `eslint-disable-next-line react-hooks/exhaustive-deps`
- `src/components/responses/ResponsesToolbar.tsx:99`: `eslint-disable-next-line react-hooks/exhaustive-deps`
- `src/components/settings/TimezoneSelect.tsx:133`: `eslint-disable-next-line react-hooks/exhaustive-deps`
- `src/components/settings/WorkspaceTab.tsx:76`: `eslint-disable-next-line react-hooks/set-state-in-effect`
- `src/components/ui/Avatar.tsx:46`: `eslint-disable-next-line @next/next/no-img-element`
- `src/components/ui/CommandPalette.tsx:85`: `eslint-disable-next-line react-hooks/exhaustive-deps`
- `src/lib/authContext.tsx:185`: `eslint-disable-next-line react-hooks/exhaustive-deps`

### Disable comments whose reason may be the comment above (12, to confirm while working that folder)

- `src/app/blog/page.tsx:26`
- `src/components/dashboard/UserProfileDropdown.tsx:100`
- `src/components/public-form/fields/SignatureRenderer.tsx:40`
- `src/components/settings/AvatarUploader.tsx:77`
- `src/components/settings/DeleteWorkspaceModal.tsx:69`
- `src/components/team/FormAccessPanel.tsx:79`
- `src/components/team/InviteMembersModal.tsx:49`
- `src/components/ui/charts/Interactive.tsx:121`
- `src/hooks/useInboxFilters.ts:78`
- `src/hooks/useInboxFilters.ts:89`
- `src/hooks/useReveal.ts:17`
- `src/hooks/useScrollProgress.ts:18`

### TODOs

There are two, and **both are stale** (section 5, rows 1 and 2). No other TODO or FIXME exists, so none would be kept.

## 5. Stale comments checked against the code

None of these showed a bug.

| # | Where | The comment says | The code does |
|---|---|---|---|
| 1 | `src/components/settings/DangerZoneSection.tsx:22` | TODO: gate the section by workspace role once roles exist; every user is the sole owner | Workspaces have roles. This section only shows in personal account settings |
| 2 | `src/components/settings/WorkspaceTab.tsx:58` | TODO: make the name read-only by role once roles exist | `/w/[slug]/settings` offers this tab only to roles that may manage workspace settings |
| 3 | `src/app/layout.tsx:61` | Theme source is a placeholder until `User.theme` ships | It has shipped; the same comment later says the account theme is synced. `CLAUDE.md` repeats the old statement |
| 4 | `src/services/stages.ts:6`, `tags.ts:6`, `views.ts:6`, `scores.ts:11` | Backend routes are not yet built | All four route groups exist in the backend's `develop` |
| 5 | `src/types/form.ts:281` | Describes `logoSize`, then "banner crops the cover..." | The second half belongs to `coverFit` on the line above, which has no comment. One-line fix |
| 6 | `src/lib/schemas/publicFormSchema.ts:160`, `src/types/publicForm.ts:65` and `:83` | Uploaded files get an R2 key | The backend stores files on local disk; R2 is only a noted future option |
| 7 | `playwright.config.ts:3` | The mock backend is `e2e/mockBackend.ts` | The file is `e2e/mockServer.ts` |
| 8 | `e2e/mocks/publicFormMocks.ts:1` | Temporary fixture; swap for the real fetch when the endpoint lands | A permanent test fixture used by `e2e/mockServer.ts` |
| 9 | Headers of 9 test files (LoginForm, SignupForm, FeaturesSection, Footer, HowItWorksSection, Button, Input, schemas.property, auth.service) | Name an old file path | The files have moved into subfolders |

Seen while reading, not part of this task: `showShare` in `src/components/form-builder/BuilderTabs.tsx` is a prop that nothing reads (its comment says so correctly).

## 6. Questions before any change

1. **Reason plus label** (703 comments, for example "Sprint 12, design.md §11.2: ..."). The spec files they point to are not in the repository.
   **Recommended:** delete only the sprint, task and spec labels, keep the reason, and keep QA ids as issue references. Alternative: leave these untouched.
2. **Section headings** (170, for example `// ─── Props ─────`).
   **Recommended:** drop the rule characters, keep the title. Alternatives: delete them, or leave them.
3. **"Contract to confirm" / "not yet built"** (56).
   **Recommended:** check each against the backend (read only), delete the status sentence where it has shipped, keep the description of the data.
4. **Repeated text** (91). Most are the same security or browser reason at two places that each need it.
   **Recommended:** keep those; remove only copies that explain nothing.

## 7. Branches

- Cleanup branches: no `chore/*` branch is left unmerged into `main`.
- **`develop` is 6 commits behind `main`** (the logo size and landing dark theme fixes). The project rule is to branch from `develop`, so this branch does. Please merge `main` into `develop` before the cleanup starts; otherwise these files are left alone: `CookieBanner.tsx`, `CtaSection.tsx`, `Footer.tsx`, `Wordmark.tsx`, `Wordmark.test.tsx`, `darkThemeBands.test.tsx`.
- **Open branch `fix/create-form-title`** is unmerged. These files are left alone until it is: `src/components/forms/CreateFormPage.tsx`, `src/lib/schemas/formSchema.ts`, `__tests__/components/forms/CreateFormPage.test.tsx`.

## 8. Not done yet

- The baseline gate (type-check, lint, unit tests and count, build and route table, e2e) will be taken before the first folder.
- The proof script (compile with comments removed, compare byte for byte) will be written outside the repository.
- The backend repository is out of scope: work is limited to this repository.

---

# Progress

## Group 1: `src/services` and `__tests__/services`

### Counts

| | Before | After |
|---|---|---|
| Comments | 204 | 199 |
| Comment lines | 690 | 597 |

39 files changed: 5 comments removed entirely, 82 edited.

### Proof and gate

| Check | Baseline | After group 1 |
|---|---|---|
| Proof (compiled output without comments, code tokens, directives) | | 39 files, **0 mismatches** |
| Type-check | pass | pass |
| Lint (`.next-proof`, a local build folder, excluded) | clean | clean |
| Unit tests | 4901 in 504 files | 4901 in 504 files |
| Build route table | | identical |
| E2E (production build) | 284 passed, 19 skipped | 284 passed, 19 skipped |

The proof script is kept outside the repository. Besides comparing compiled output, it compares code tokens, because compiling drops types.

### Ten samples to spot-check

**1. `src/services/stages.ts` (shipped)**
```diff
- * BE 0.1 — new infrastructure, not yet built (design.md §11.2). Built against the documented
- * contract; the backend developer owns final field naming ("Backend contract to confirm").
- * Envelope unwrapped defensively (design.md §12's own instruction) since nothing here has been
- * exercised against a live response yet.
+ * Envelope unwrapped defensively.
```

**2. `src/services/reports.ts` (not shipped)**
```diff
- // Sprint 12 (inbox-collaboration), design.md §11.2 — Backend contract to confirm: the stage
- // name snapshot replacing `responseStatus`. Uncertain/not yet live (BE 0.4), so both are read
- // defensively; `responseStatus` stays for a job created before this sprint (OQ-2's alias).
+ // Not built yet in the backend: the stage name snapshot replacing `responseStatus`. Both are read
+ // defensively; `responseStatus` stays for a job created before it.
```

**3. `src/services/responses.ts` (partly shipped)**
```diff
- // POST /api/responses/bulk (design.md §11.2, task 2.2): "413 batch over cap (cap stated in
- // response)". Surfaced as a typed error rather than a generic axios failure so
- // `useInboxMutations`/`BulkActionBar` can show a specific message instead of the default
- // "failed to update" toast. `cap` is read defensively — the exact response shape for the cap is
- // itself "Backend contract to confirm".
+ // POST /api/responses/bulk answers 413 for a batch over the cap. Surfaced as a typed error rather
+ // than a generic axios failure so `useInboxMutations`/`BulkActionBar` can show a specific message
+ // instead of the default "failed to update" toast. `cap` is read defensively. Not built yet in the
+ // backend: a `cap` field (the limit is only named in the message).
```

**4. `src/services/analytics.ts` (stale)**
```diff
- // Bug fix, Sprint 12 close-out: none of these four calls ever sent a workspace header at all —
- // (...5 lines...) Explicit
- // 'personal' is unconditionally correct here — no /w/[slug]/analytics route exists yet, same
- // reasoning `ReportsView`'s own `formsService.getForms(..., { type: 'personal' })` already
- // established for this page family.
+ // Every call names its context (`scope`, 'personal' by default). With no workspace header the
+ // backend's `getVerifiedWorkspaceId` falls through header, query and body to the caller's default
+ // workspace, so the Personal analytics page showed that workspace's forms instead of nothing.
```

**5. `src/services/forms.ts` (stale: contradicted the line above it)**
```diff
- // Real bug found and fixed: the comment above already flagged this as unconfirmed — now
- // confirmed live. (...) `workspaceId=personal`
- // isn't honored server-side for this case. Filtered here as a client-side safety net
- // (...)
+ // It was added when a new user whose default workspace was the one they had just joined saw that
+ // workspace's forms in their *personal* list. Never trust the backend's scoping without checking:
+ // Personal space must not show a workspace-owned form, whatever the query returned.
```

**6. `src/services/publicForm.ts` (wrong: the file does use Axios)**
```diff
- * fetch() only — no Axios, no auth headers, no cookies.
+ * Public calls use fetch() with no auth headers and no cookies; only getSubmitTicket() goes through Axios and the BFF.
```

**7. `src/services/invitations.ts` (stale: the Accept page uses it)**
```diff
- // Public, token-based — Wednesday's Invite Accept page (task 5.1) is the consumer. Built now
- // since task 2.2 bundles all seven methods as one unit; not wired into any UI today.
+ // Public, token-based: used by the Invite Accept page.
```

**8. `src/services/responses.ts` (history only, removed)**
```diff
- // Sprint 12 (inbox-collaboration), task 1.3: replaces the old 3-request client-side computation
- // with the confirmed-live single GET /api/responses/stats call (closes the known low-severity
- // issue in PROJECT_STATUS.md), extended for stages (design.md §2/§11.2).
```

**9. `__tests__/services/auth.service.test.ts` (labels, old path, heading)**
```diff
- * __tests__/auth.service.test.ts
- * Feature: sprint-1-frontend-auth
   * Tests: Auth Service — signup, login, getMe, logout functions
- * Requirements: 6.1, 6.4, 6.5, 8.1, 13.1, 13.5
- // ─── Mock Firebase auth ─────────────────────────────────────────
+ // Mock Firebase auth
```

**10. `__tests__/services/tags.service.test.ts` (whole header was labels and an outdated status)**
```diff
- /**
-  * __tests__/services/tags.service.test.ts
-  * sprint-12-inbox-collaboration, requirements.md §7.7, design.md §11.2/§12, task 2.2.
-  * Built against the documented (not yet live) contract — see tagsService's own comment.
-  */
```

### Judgement calls to confirm

- The first line of a test header that only repeats the file's own path was removed (restating, and sometimes wrong).
- Kept: dates inside a reason ("confirmed live 12 Aug 2026"), links to documents (`docs/...`, `Beginso-Report/...`, handoff files), and the QA id that sits beside a reason.
- Outdated comments found here beyond the first list, now corrected: `publicForm.ts` header, `invitations.ts` (preview), `analytics.ts` (two), `forms.ts` (two), `workspaces.ts` (delete endpoint "is needed"), `reports.ts` (list keys).

### Findings (code not changed)

1. **Possible gap:** the backend never sends `stage` on a report job (`Report` model and list reply, backend `develop`). `ReportJobRow` shows the stage name only from `job.stage`, so an export limited to one stage would show no stage name. Not reproduced in the app.
2. `showShare` in `BuilderTabs.tsx` is passed by the edit page but never read.

No eslint-disable line is in this group. The `CLAUDE.md` correction will be its own commit, with the `layout.tsx` comment it matches.
