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

---

## Group 2: `src/lib` and `__tests__/lib`

### Counts

| | Before | After |
|---|---|---|
| Comments | 739 | 729 |
| Comment lines | 1652 | 1529 |

64 files changed: 10 comments removed entirely, 137 edited. `src/lib/schemas/formSchema.ts` was skipped (`fix/create-form-title` is not merged).

### Proof and gate

| Check | Result against the baseline |
|---|---|
| Proof (compiled output without comments, code tokens, directives) | 64 files, **0 mismatches** |
| Type-check, lint (`.next-proof` excluded) | clean, as before |
| Unit tests | 4901 in 504 files, as before |
| Build route table | identical |
| E2E (production build) | 284 passed, 19 skipped, as before |

### Ten samples to spot-check

**1. `src/lib/queryKeys.ts` (a 26-line audit note that was wholly outdated)**
```diff
- // sprint-11-v2a-hardening, requirements.md §7.3 (2.6) — query-key audit (...) every one of these renders only under
- // the personal (user) shell — no /w/[slug]/responses|analytics|reports|dashboard route exists (...)
- // **Backend contract to confirm:** do these personal-shell pages actually receive personal-scoped data (...)
+ // Every key factory keeps one context's cached rows apart from another's, in one of two ways:
+ //
+ // (a) The context is a key segment: `scope` (a workspace slug or 'personal') or the workspace itself, (...)
+ // (b) The key is already unique or per-caller, so a workspace segment would be redundant: (...)
```

**2. `src/lib/workspaceServer.ts` (the backend now returns the role)**
```diff
- // role/isOwner are optional because GET /api/workspaces/:id does not return them yet —
- // requirements.md §4/§8.7 (sprint-9-team-permissions, BE 0.1) names this as a required backend
- // change, not yet shipped. Until it lands, these are always undefined at runtime; every consumer
+ // role/isOwner are optional because they are read defensively from the reply. Every consumer
```

**3. `src/lib/roles.ts` (the backend does gate templates)**
```diff
- // Templates is an already-shipped feature visible to every current user, not a new one gated
- // behind BE 0.1 landing — (...) nothing server-side actually gates this route by role either).
+ // Templates is visible to every other role, and hiding it while the role is still loading would
+ // take it from everyone, for a purely cosmetic nav filter. The server decides who may read
+ // templates.
```

**4. `src/lib/schemas/publicFormSchema.ts` (stale item 6)**
```diff
- // Value is the uploaded file's R2 key once the file finishes uploading.
+ // Value is the picked file's name (a placeholder); the file itself travels outside the form values.
```

**5. `src/lib/chartOptions.ts` (rating is a field type now)**
```diff
- // server re-validates. Rating is not a builder field type yet - it is accepted defensively so a
- // future 'rating' field charts without a code change.
+ // server re-validates.
```

**6. `src/lib/layoutPresets.ts` (there are ten presets)**
```diff
- // Sprint 13 (CF2.7), requirements.md 2.1–2.3. The six presets and the ONE mapper from a stored
+ // The presets and the ONE mapper from a stored
```

**7. `src/lib/authContext.tsx` (reason added to a disable comment)**
```diff
- // eslint-disable-next-line react-hooks/exhaustive-deps
+ // eslint-disable-next-line react-hooks/exhaustive-deps -- initAuth keeps one identity, so the mount effect below runs it once
```

**8. `src/lib/responseList.ts` (history only, removed)**
```diff
- // runSequentially() removed (task 2.3, design.md §2): retired for bulk in favor of one-request
- // `POST /api/responses/bulk` (`useInboxMutations.bulk`). Confirmed it had no other importer
- // before deleting (design.md §2's own instruction).
```

**9. `__tests__/lib/noHardcodedColors.test.ts` (described files that no longer exist)**
```diff
-  * Files deliberately NOT in this list, and why:
-  * - src/components/dashboard/{Sidebar,TopNav,DashboardShell,WelcomeSection}.tsx — dead code (...)
-  * - src/app/onboarding/layout.tsx — one deliberate `bg-neutral-50` (...)
+  * Reads an explicit array of source files (not a glob over src/) and fails if any of them
+  * contain a banned raw-palette class.
```

**10. `src/lib/chartBuilder.ts` (section heading)**
```diff
- // ── what can be charted ──────────────────────────────────────────────────────
+ // what can be charted
```

### Outdated comments corrected beyond the first list

`queryKeys.ts`, `workspaceServer.ts`, `workspaceHeaders.ts`, `roles.ts`, `chartOptions.ts`, `layoutPresets.ts`, `fetchAllResponses.ts` (a chart view that no longer calls it), `templatePreview.ts` (templates now have pages and branding), `noHardcodedColors.test.ts`, `tokenContrast.test.ts` (the two near-misses were already fixed).

### Left unchanged, not sure

`src/lib/layoutPresets.ts:8` says all copy comes from the V2 wireframe and must not be reworded. There are now ten presets; whether the newer ones came from that wireframe cannot be told from this repository.

### Disable comments

One reason added (`authContext.tsx`). 18 of the 19 without a reason remain, in groups not yet done.

---

## Group 3: `src/types`, `src/hooks`, `src/store` and their tests

### Counts

| | Before | After |
|---|---|---|
| Comments | 567 | 566 |
| Comment lines | 1034 | 982 |

42 files changed: 1 comments removed entirely, 144 edited.

### Proof and gate

Proof: **0 mismatches**. Type-check and lint clean, 4901 unit tests in 504 files, build route table identical, e2e 284 passed and 19 skipped: all the same as the baseline.

### Ten samples to spot-check

**1. `__tests__/hooks/useInboxMutations.test.tsx:179`**
```diff
-// design.md §21 property: "undo of a bulk action restores the exact previous state". Exercised
+// Property: "undo of a bulk action restores the exact previous state". Exercised
```

**2. `src/hooks/useFormsPage.ts:154`**
```diff
-  // may include `owner` on the row (contract to confirm — form.ts), so read it defensively.
+  // may include `owner` on the row, so read it defensively.
```

**3. `src/hooks/useMembers.ts:6`**
```diff
- * Sprint 12 (inbox-collaboration), design.md §6/§10: the assignee/mention pickers reuse
- * `teamService.listMembers` (already built for Sprint 9's Team page) rather than a new endpoint.
- * Only meaningful for a workspace scope — the personal shell has no team (OQ-9).
+ * The assignee/mention pickers reuse
+ * `teamService.listMembers` (already built for the Team page) rather than a new endpoint.
+ * Only meaningful for a workspace scope — the personal shell has no team.
```

**4. `src/hooks/usePublicTemplates.ts:8`**
```diff
-// Phase 2 (.kiro/specs/public-template-gallery/tasks.md, task 7): GET /api/templates/public
-// confirmed live in production 26 Sep 2026 (curl-verified: 200, no cookie, real data) — this now
-// calls it directly. The Phase 1 mock/fixture has been removed.
+// GET /api/templates/public
+// confirmed live in production 26 Sep 2026 (curl-verified: 200, no cookie, real data).
```

**5. `src/hooks/useTags.ts:6`**
```diff
- * Sprint 12 (inbox-collaboration), design.md §10/§12, tasks 2.4/2.5. Only meaningful for a
- * workspace scope — the personal shell has no tag library endpoint (OQ-9's tags-default applies
- * to notes more than a workspace-owned library; the tag picker/manager are workspace-only here,
- * same gate `useMembers` already applies).
+ * Only meaningful for a
+ * workspace scope — the personal shell has no tag library endpoint, so the tag picker/manager
+ * are workspace-only,
+ * same gate `useMembers` already applies.
```

**6. `src/store/builderStore.ts:624`**
```diff
-  // ─── Pages ────────────────────────────────────────────────────────────────
+  // Pages
```

**7. `src/types/event.ts:18`**
```diff
-  // Sprint 14 (B5.3): free-form per action - e.g. `rows` (row count) and `format` on report.create /
+  // Free-form per action - e.g. `rows` (row count) and `format` on report.create /
```

**8. `src/types/publicForm.ts:88`**
```diff
-// ─── Field Renderer Contract ─────────────────────────────────────────────────────
+// Field Renderer Contract
```

**9. `src/types/savedView.ts:0`**
```diff
-/**
- * Sprint 12 (inbox-collaboration), requirements.md §7.6, design.md §11.1/§11.2. Backend contract
- * to confirm — field names are a proposal.
- */
```

**10. `src/types/stage.ts:45`**
```diff
-// Bug fix, Sprint 12 close-out: OQ-9's resolution ("stages fixed to defaults" for the personal
+// Bug fix: "stages fixed to defaults" for the personal
```

### Notes

- **`shared/types/` was left unchanged** (93 comments). Its README and file headers say the backend developer owns these files and the frontend does not edit them. Say if you want them cleaned anyway.
- "Contract to confirm" notes were checked against the backend's `develop`. Shipped ones lost the status sentence. Written as **"Not built yet in the backend"**: stage ids on activity entries, the report job's `stage` snapshot, `attachmentCount`, the `score` object, and the "removed" flag on an assignee.
- The stale `form.ts` comment is fixed: the cover-fit sentence now sits on `coverFit`.
- Rewritten because the code or backend had moved on: the `FormAccessGrant` and shared-form item notes in `types/team.ts` (the backend now sends email and names), the form overview and owner notes in `types/form.ts`, `useWorkspaceRole`, `useWorkspaceTimezone`.
- An `@deprecated` sentence in `types/analytics.ts` that sat on the current `categoryCounts` field was removed, so editors no longer show that field as deprecated.

### Findings (code not changed)

- `UploadState.key` is declared but never set.


---

## Group 4: `components/responses` and its tests

### Counts

| | Before | After |
|---|---|---|
| Comments | 486 | 481 |
| Comment lines | 920 | 884 |

39 files changed: 5 comments removed entirely, 78 edited.

### Proof and gate

Proof: **0 mismatches**. Type-check and lint clean, 4901 unit tests in 504 files, build route table identical, e2e 284 passed and 19 skipped: all the same as the baseline.

### Ten samples to spot-check

**1. `__tests__/components/responses/BulkActionBar.test.tsx:2`**
```diff
- * __tests__/components/responses/BulkActionBar.test.tsx
- * sprint-12-inbox-collaboration, requirements.md §7.5 (5.1), design.md §15, task 2.4 rebuild:
- * role-gated actions (omitted, not disabled), "Select all N matching" sends a filter, a 200-id
+ * Role-gated actions (omitted, not disabled), "Select all N matching" sends a filter, a 200-id
```

**2. `__tests__/components/responses/ResponseRow.test.tsx:2`**
```diff
- * __tests__/components/responses/ResponseRow.test.tsx
- * sprint-12-inbox-collaboration, requirements.md §7.2 (2.1) — `ResponseRow.tsx` no longer exports
- * one `<tr>` component (task 1.7's own note: `ui/Table`'s render-function column API doesn't fit
+ * `ResponseRow.tsx` no longer exports
+ * one `<tr>` component (`ui/Table`'s render-function column API doesn't fit
```

**3. `__tests__/components/responses/ResponsesToolbar.test.tsx:2`**
```diff
- * __tests__/components/responses/ResponsesToolbar.test.tsx
- * sprint-12-inbox-collaboration, requirements.md §7.2 (2.2) — stage/assignee filters now come
- * from workspace data (`stages`/`members` props), not the removed status union (task 1.7).
+ * Stage/assignee filters come
+ * from workspace data (`stages`/`members` props).
```

**4. `__tests__/components/responses/viewSignals.test.tsx:58`**
```diff
-  // Unread — rendered textually somewhere, never colour-only (requirements.md §11).
+  // Unread — rendered textually somewhere, never colour-only.
```

**5. `src/components/responses/BoardColumn.tsx:47`**
```diff
- * Sprint 12 (inbox-collaboration), requirements.md §7.4 (4.1), design.md §20 (task 3.2): "each
- * column paginates independently" — a `useInfiniteQuery` per column (not one combined list query)
+ * Each
+ * column paginates independently: a `useInfiniteQuery` per column (not one combined list query)
```

**6. `src/components/responses/MentionPicker.tsx:25`**
```diff
- * Sprint 12 (inbox-collaboration), requirements.md §9.2, design.md §6. Full ARIA combobox/listbox
- * pattern (the one place this sprint requires it, unlike TagPicker's lighter listbox): arrow keys
+ * Full ARIA combobox/listbox
+ * pattern (unlike TagPicker's lighter listbox): arrow keys
```

**7. `src/components/responses/ResponseDrawer.tsx:540`**
```diff
-              {/* "Edited after review" indicator — Sprint 13 (A5.2), space reserved, not built. */}
+              {/* "Edited after review" is shown by WorkflowSidebar, not here. */}
```

**8. `src/components/responses/ResponsesCalendar.tsx:194`**
```diff
-      {/* Mobile agenda — a 7-column grid is unreadable at 375px (design.md §16's own note) */}
+      {/* Mobile agenda — a 7-column grid is unreadable at 375px */}
```

**9. `src/components/responses/ResponsesToolbar.tsx:26`**
```diff
-  /** View switcher (Table · Board · Calendar · Chart) lives on this bar when provided. */
+  /** View switcher (Table · Board · Calendar) lives on this bar when provided. */
```

**10. `src/components/responses/TagPicker.tsx:26`**
```diff
- * Sprint 12 (inbox-collaboration), requirements.md §7.7 (7.1), design.md §6. Tag picker for the
- * detail sidebar/bulk bar: search the workspace library, create inline when permitted (OQ-5).
- * A lighter custom listbox rather than a full ARIA combobox (`MentionPicker`, task 4.2, is where
- * that full pattern is required by requirements.md §9.2) — every control here is still a real,
+ * Tag picker for the
+ * detail sidebar/bulk bar: search the workspace library, create inline when permitted.
+ * A lighter custom listbox rather than a full ARIA combobox (`MentionPicker` is where
+ * that full pattern is required) — every control here is still a real,
```

### Notes

- `{/* */}` comments in JSX are never removed, only reworded: removing one changes the compiled output, which the proof forbids. One placeholder that said an indicator was "not built" now says the notice is in `WorkflowSidebar`.
- Corrected because the code had moved on: mentions of a "Chart" view (only Table, Board and Calendar exist), `DashboardShell` as the scrolling element, and "only Submitted is sorted by the server" in `ResponsesTable`.
- Marked "Not built yet in the backend": an endpoint listing who can access a form (`MentionPicker`).
- History removed: a retired test case's note and "was hardcoded to 'table'".


---

## Group 5: `components/form-builder` and its tests

### Counts

| | Before | After |
|---|---|---|
| Comments | 414 | 414 |
| Comment lines | 646 | 639 |

26 files changed: 0 comments removed entirely, 56 edited.

### Proof and gate

Proof: **0 mismatches**. Type-check and lint clean, 4901 unit tests in 504 files, build route table identical, e2e 284 passed and 19 skipped: all the same as the baseline.

### Ten samples to spot-check

**1. `__tests__/components/form-builder/OptionsEditor.test.tsx:3`**
```diff
- * Requirements: 2.1-2.7
```

**2. `src/components/form-builder/BrandingPanel.tsx:25`**
```diff
-// ─── Image upload zone (shared by Logo + Cover Image sections) ────────────────
+// Image upload zone (shared by Logo + Cover Image sections)
```

**3. `src/components/form-builder/Canvas.tsx:110`**
```diff
-// ─── Main Canvas component ────────────────────────────────────────────────────
+// Main Canvas component
```

**4. `src/components/form-builder/FieldCard.tsx:33`**
```diff
-// ─── Dashed drop-zone card ────────────────────────────────────────────────────
+// Dashed drop-zone card
```

**5. `src/components/form-builder/FieldPreview.tsx:7`**
```diff
-// ─── Live, non-interactive preview of a field's public-form appearance ────────
+// Live, non-interactive preview of a field's public-form appearance
```

**6. `src/components/form-builder/LeaveBuilderModal.tsx:7`**
```diff
-// Sprint 13 (CF2.9), requirements.md 1.2 / wireframe 39. Autosave is the save mechanism, so the
-// old "Save and leave" button is gone (OQ-1 default): this guard exists only for the window where
+// Wireframe 39. Autosave is the save mechanism, so there is no
+// "Save and leave" button: this guard exists only for the window where
```

**7. `src/components/form-builder/PagesPanel.tsx:136`**
```diff
-// ─── Compact page switcher (< 1024px) ───────────────────────────────────────
-// Sprint 13 (CF2.12, requirements.md 4.4). Below 1024px the Pages panel is gone, but editing the
+// Compact page switcher (< 1024px)
+// Below 1024px the Pages panel is gone, but editing the
```

**8. `src/components/form-builder/SettingsPanel.tsx:111`**
```diff
-            (OQ-9); this control only reads and writes `settings.accessMode`. */}
+            to make; this control only reads and writes `settings.accessMode`. */}
```

**9. `src/components/form-builder/embed/EmbedStudio.tsx:23`**
```diff
-// Share & Embed, CF6.2a. One state object drives the code block, the live preview and the Advanced list through
+// One state object drives the code block, the live preview and the Advanced list through
```

**10. `src/components/form-builder/useBuilderFormMutations.ts:55`**
```diff
-      // Delete means Trash since Sprint 13 (CF5.5): reversible for 30 days.
+      // Delete means Trash: reversible for 30 days.
```

### Notes

- Corrected because the code had moved on: the add-field sheet is for phones below 640px (not 1024px), the layout tiles are no longer "six", the embed builder has four methods, and "Generate new link" exists in the publish flow.
- History removed: the note on a missing accessibility pass in `BuilderTabs` and the "replaces the old PropertiesPanel" note.
- Disable comment: reason added in `useBuilderLeaveGuard.ts`.


---

## Group 6: `components/ui`, `components/analytics` and their tests

### Counts

| | Before | After |
|---|---|---|
| Comments | 576 | 558 |
| Comment lines | 1070 | 929 |

79 files changed: 18 comments removed entirely, 92 edited.

### Proof and gate

Proof: **0 mismatches**. Type-check and lint clean, 4901 unit tests in 504 files, build route table identical, e2e 284 passed and 19 skipped: all the same as the baseline.

### Ten samples to spot-check

**1. `__tests__/analytics/dateRange.property.test.ts:2`**
```diff
- * __tests__/analytics/dateRange.property.test.ts
- * Feature: sprint-5-analytics-reports, Property 1: Date range normalization never inverts
- * Validates: Requirement 3.4
+ * Property: date range normalization never inverts
```

**2. `__tests__/components/analytics/FormsSummaryTable.test.tsx:3`**
```diff
- * Requirements: 7.1-7.7
```

**3. `__tests__/components/ui/Avatar.test.tsx:1`**
```diff
- * __tests__/components/ui/Avatar.test.tsx
- * Feature: sprint-7-foundation
```

**4. `__tests__/components/ui/EmptyState.test.tsx:0`**
```diff
-/**
- * __tests__/components/ui/EmptyState.test.tsx
- * Feature: sprint-7-foundation
- */
-
```

**5. `__tests__/components/ui/Sidebar.test.tsx:11`**
```diff
-    // A badge without a label keeps its old, bare form.
+    // A badge without a label keeps the bare form.
```

**6. `__tests__/components/ui/Tabs.test.tsx:1`**
```diff
- * __tests__/components/ui/Tabs.test.tsx
- * Feature: sprint-7-foundation
```

**7. `src/components/analytics/DateRangeFilter.tsx:32`**
```diff
-  /** Controlled mode (Reports' staged, non-URL filters, Thursday) — omit to let the filter own
-   * `?from=&to=` in the URL directly (Auto-Dashboard / Workspace Analytics), the same
-   * `updateParams` pattern the Responses Hub uses. */
+  /** Controlled mode (Reports' staged, non-URL filters) — omit to let the filter own
+   * `?from=&to=` in the URL directly. */
```

**8. `src/components/analytics/builder/ChartPreviewCard.tsx:17`**
```diff
-  /** Shows the chart-type select at the card's top right (the first steps); the last step shows the card as the dashboard will. */
+  /** Shows the chart-type select at the card's top right (the basics step); the last step shows the card as the dashboard will. */
```

**9. `src/components/ui/Drawer.tsx:13`**
```diff
-  /** 'bottom' renders a bottom sheet (Sprint 13, CF2.12) — same focus trap and scroll lock. */
+  /** 'bottom' renders a bottom sheet — same focus trap and scroll lock. */
```

**10. `src/components/ui/Pagination.tsx:13`**
```diff
-// a data-shape change (requirements.md 2.3).
+// a data-shape change.
```

### Notes

- Corrected outdated comments in `ui`: `AppShell.tsx` (top bar is 52px, sidebar 220px, no "Responses chart view"), `Avatar.tsx` (the forms list does return an owner), `Input.tsx` (not every right slot is a button), `Menu.tsx` (`StatusDropdown.tsx` does not exist; the trigger override has many callers), `Sidebar.tsx` (`dashboard/Sidebar.tsx` does not exist; this sidebar is in use), `Table.tsx` (loading rows are drawn by the table itself), `Toast.tsx` (no `Toast.ts` re-export exists), `Segmented.tsx` (no "Chart" view), `ContextSwitcher.tsx`, `Modal.tsx` (history removed).
- Corrected in `analytics`: `AnalyticsStatCards.tsx` (a trend line, not bars), `CompletionRateCard.tsx` (the reason is shown under the dash, not in a tooltip), `DateRangeFilter.tsx` (no `updateParams` elsewhere; the analytics pages pass a value), `FormsSummaryTable.tsx` (logo or icon per form), `ResponsesOverTimeCard.tsx` (has Monthly, highlights no peak), `StatusDistributionChart.tsx` (lists stages when it has them, not always three categories), `ChartPreviewCard.tsx`, `wizardState.ts` (the steps are a row, not a left list).
- Tests: removed path, sprint and requirement header lines, one retired test's note and two history notes.
- Nothing is marked "Not built yet in the backend". The saved charts and the response segment filter exist in the backend's `develop`.
- Disable comments: reasons added in `ui/Avatar.tsx` and `ui/CommandPalette.tsx`. `ui/charts/Interactive.tsx:121` confirmed: the comment above is its reason.
- Left unchanged: the `ponytail:` note in `AnalyticsView.tsx`; "add a new chart" on `ChartDrawer`'s `editing` prop (true of the component, though no screen uses it, see below).

### Findings (code not changed)

- `analytics/ChartDrawer.tsx` is only opened to edit (`CustomChartsSection.tsx`), so its "Add chart" mode looks unused.
- `analytics/FormsByStatusCard.tsx`: the donut branch needs more than three segments and there are only three statuses.
- `analytics/TrendChart.tsx`: `formatBucketLabel` takes a `_bucket` argument it never reads.
- `AnalyticsView`, `AnalyticsViewRange`, `QuestionBreakdownSection` and `QuestionSummaryCard` tests mock `@/components/charts/EChartContainer`, which no longer exists.


---

## Group 7: `components/public-form`, `settings`, `forms` and their tests

### Counts

| | Before | After |
|---|---|---|
| Comments | 506 | 497 |
| Comment lines | 1034 | 941 |

64 files changed: 9 comments removed entirely, 113 edited.

### Proof and gate

Proof: **0 mismatches**. Type-check and lint clean, 4901 unit tests in 504 files, build route table identical, e2e 284 passed and 19 skipped: all the same as the baseline.

### Ten samples to spot-check

**1. `__tests__/components/forms/BulkActionBar.test.tsx:35`**
```diff
-  // Sprint 11 5.3: computed role, not JSX presence — role="status" gives an implicit
+  // Computed role, not JSX presence — role="status" gives an implicit
```

**2. `__tests__/components/public-form/FormUnavailable.test.tsx:1`**
```diff
- * Feature: sprint-3-public-form
```

**3. `__tests__/components/settings/NotificationsTab.test.tsx:116`**
```diff
-  // sprint-11-v2a-hardening 1.4 — token pass regression: no raw neutral/white/brand class left in source.
+  // Token pass regression: no raw neutral/white/brand class left in source.
```

**4. `__tests__/components/settings/WorkspaceTab.test.tsx:32`**
```diff
-// itself now also calls useAuth() for the orphaned-account "Log out" action.
+// itself also calls useAuth() for the orphaned-account "Log out" action.
```

**5. `src/components/forms/BulkActionBar.tsx:16`**
```diff
-// sprint-10-events-migration, task 6.4. Sequential per-id calls (task 6.4's own stated reasoning) — no batch
-// endpoint assumed or built. Sprint 13: Archive now exists (`archivedAt`, CF5.6) and is offered only when the
-// caller can archive; Delete means "move to Trash" (CF5.5).
+// Sequential per-id calls — no batch
+// endpoint assumed or built. Archive is offered only when the
+// caller can archive; Delete means "move to Trash".
```

**6. `src/components/forms/FormsDialogs.tsx:20`**
```diff
-      {/* requirements.md §7.8 — works identically on a personal or workspace form; this same
-          FormsPage/FormRow is already shared between (user)/forms and /w/[slug]/forms (Sprint 8),
-          so no per-context branching is needed here (design.md §4). */}
+      {/* Works identically on a personal or workspace form; this same
+          FormsPage is already shared between (user)/forms and /w/[slug]/forms,
+          so no per-context branching is needed here. */}
```

**7. `src/components/public-form/PublicFormShell.tsx:648`**
```diff
-              behavior does, and that value is passed through to the backend as-is (Requirement 6.5). */}
+              behavior does, and that value is passed through to the backend as-is. */}
```

**8. `src/components/public-form/layouts/index.ts:11`**
```diff
-// using Classic never pays for them (requirements.md §15).
+// using Classic never pays for them.
```

**9. `src/components/settings/NotificationsTab.tsx:121`**
```diff
-  // Correctness Property 2: after any sequence of flips (including failed ones), the displayed
+  // After any sequence of flips (including failed ones), the displayed
```

**10. `src/components/settings/SettingsTabs.tsx:64`**
```diff
-// Vertical section nav (spec Phase 6): grouped, one column on desktop, a scrolling row below `lg`.
+// Vertical section nav: grouped, one column on desktop, a scrolling row below `lg`.
```

### Notes

- The two stale TODOs about workspace roles are removed (`DangerZoneSection.tsx`, `WorkspaceTab.tsx`).
- "Guided only" comments now say one-at-a-time layouts, because Chat and Focus use the same flow (`PublicFormShell.tsx`, `layouts/shared.tsx`). `GuidedLayout.tsx` no longer says review-before-submit does not exist yet.
- Also corrected in the public form: which layouts show step names, Compact always having two columns, and what appears above the submit buttons (only the preview's test controls) in `PublicFormShell.tsx` and `ReviewStep.tsx`.
- Form headers: only Overview and the builder share `FormHeader`, and there is no tab bar (`FormHeader.tsx`, `FormLevelHeader.tsx`, `FormDataHeader.tsx`). `FormRow` no longer exists (`FormsDialogs.tsx`).
- Form activity: the card receives up to 50 events, and the response has no total (`FormActivityCard.tsx`, `FormActivityDrawer.tsx`). Views are tracked now, so the completion-rate comment in `FormOverviewStats.tsx` is reworded.
- Settings: tab hosting is in `SettingsView`, not the settings page (`TagManager.tsx`, its test, `unsavedTabState.property.test.tsx`, `ProfileTab.tsx`). Column widths in `SettingsView.tsx`, shared caches in `DataTab.tsx` and `NotificationsTab.tsx`, the Appearance tab note in `SettingsTabs.tsx`, and how the delete modal is reached (`DeleteWorkspaceModal.tsx`) are corrected. `TagManager.tsx` no longer claims it checks `canManageTags` itself.
- Tests: corrected the tab count note (`SettingsTabs.test.tsx`), the mocked component (`BrandingTab.test.tsx`) and who calls `validateFile` (`avatarFileValidation.property.test.ts`). A wrong comment about why `ProfileTab.test.tsx` mocks Firebase is removed.
- Backend checked on `develop`: session list, export status, account deletion, field ids on submit errors, pinning archived forms and stage counts have all shipped. Nothing in this group is marked "Not built yet in the backend".
- Disable comments, reasons added: `OwnerMonogram.tsx`, `AvatarUploader.tsx`, `TimezoneSelect.tsx`, `WorkspaceTab.tsx`.
- Disable comments, reason confirmed as the comment above: `SignatureRenderer.tsx`, `DeleteWorkspaceModal.tsx`. For `AvatarUploader.tsx` the comment above is about `referrerPolicy`, not the disable, so it got its own reason. None are left without one.
- Left unchanged: two comment blocks sit above the wrong function (the "final-submit validation" part in `PublicFormShell.tsx` belongs to `onInvalid`; the "every link this page builds" part in `formsListUtils.ts` belongs to `formHref`). Moving them needs new lines.
- Left unchanged: test names that still mention sprint labels or `ui/Tabs`, because they are code. `CLAUDE.md` still says settings tabs live in `settings/page.tsx` and that Settings uses `BrandingPanel`.

### Findings (code not changed)

- `WorkspaceTab.tsx`: the `!scope` account-level Danger Zone looks unreachable. Account settings do not offer the Workspace tab, and workspace settings always pass `scope`.
- `ProfileTab.test.tsx`: the Firebase mock looks unneeded, since `ProfileTab` does not import Firebase.
- `PublicFormShell.tsx`: `accessExtra` and `hasAccessExtra` only wrap `testControls` (leftover indirection).


---

## Group 8: all other components and their tests

### Counts

| | Before | After |
|---|---|---|
| Comments | 559 | 534 |
| Comment lines | 1170 | 1020 |

78 files changed: 25 comments removed entirely, 152 edited.

### Proof and gate

Proof: **0 mismatches**. Type-check and lint clean, 4901 unit tests in 504 files, build route table identical, e2e 284 passed and 19 skipped: all the same as the baseline.

### Ten samples to spot-check

**1. `__tests__/components/auth/LoginForm.test.tsx:266`**
```diff
-        // Toggle back to password
```

**2. `__tests__/components/landing/Footer.test.tsx:2`**
```diff
- * Requirements: 0.25, 0.26
```

**3. `__tests__/components/team/AuditTable.test.tsx:1`**
```diff
- * sprint-10-events-migration, tasks.md 4.3 — design.md §21, requirements.md §7.7, §11.
```

**4. `__tests__/components/workspaces/MoveFormModal.test.tsx:113`**
```diff
-    // Modal should still be open
```

**5. `src/components/dashboard-grid/workspaceHome.ts:13`**
```diff
-// Everything here is derived from the forms list the Workspace Home already fetches — no new calls.
+// Apart from the map locations (passed in), everything here is derived from the forms list the Workspace Home already fetches.
```

**6. `src/components/landing/ProductMockup.tsx:402`**
```diff
-            {/* Full composition (>=1280) and mid composition (1024-1279, table only) */}
+            {/* Full composition (>=1280) and mid composition (768-1279, table only) */}
```

**7. `src/components/reports/ReportJobRow.tsx:99`**
```diff
-  // Never cached across clicks (Correctness Property 5) — every click re-fetches a fresh blob URL.
+  // Never cached across clicks — every click re-fetches a fresh blob URL.
```

**8. `src/components/search/SearchTrigger.tsx:17`**
```diff
-// Sprint 14 (requirements 2.1, task 3.9): the top-bar search entry - a field-shaped button with the
+// The top-bar search entry - a field-shaped button with the
```

**9. `src/components/team/SharedFormCard.tsx:21`**
```diff
-// requirements.md §7.9 asks for "sharer" on the card. Real bug found and fixed (22 Sep 2026): this
-// used to render nothing for the sharer, because the live `sharedBy` was a raw userId with no name
-// anywhere in the payload — now live-confirmed enriched (services/shared.ts's own mapping), so the
-// sharer's name renders when the backend actually sent one, and degrades to nothing (never a raw
+// The sharer's name renders when the backend sent one, and degrades to nothing (never a raw
```

**10. `src/components/workspaces/CreateWorkspaceModal.tsx:28`**
```diff
-// Name-only create flow (requirements.md §7.5) — slug generated server-side, timezone defaulted,
-// matching BE 1.1's confirmed contract (design.md §13). Mirrors CreateFormModal's exact
-// react-hook-form + zod + ui/Modal shape rather than inventing a new pattern.
+// Name-only create flow — slug generated server-side, timezone defaulted,
+// matching the backend's contract. A plain
+// react-hook-form + zod + ui/Modal form.
```

### Notes

- Corrected, exports (`ReportsView`, `ReportJobsList`, `ReportJobRow`, `ReportsView.test`): there is no "Insights Exports tab", workspace exports have their own route, the status picker exists, the backend does send `formTitle`, and `format` is a fixed `csv`/`pdf` list.
- Corrected, scoring (`ScoreCard`): the input is stars (not a radio scale), there is no manage link, and the optimistic average only applies when there is no average yet.
- Corrected, sidebars and shells (`PersonalSidebar`, `WorkspaceSidebar`, `PersonalShell`, `WorkspaceShell` and the two sidebar tests): "My Submissions" is in the menu, the old `DashboardShell` and `dashboard/Sidebar` files are gone, the workspace pages once listed as missing exist, the backend sends the caller's role, there is no Reports tab or form Settings page, and `?ws=` links come from `formHref`.
- Corrected, others: the bell polls every 60 s, not 45 (`NotificationBell`); the dashboard demo no longer points to a future persistence phase (`DashboardDemo`); map locations come from a separate call (`workspaceHome.ts`); the middle mockup layout starts at 768 px (`ProductMockup`); revoking access does ask first (`FormAccessPanel`); `CreateFormModal` no longer exists (`CreateWorkspaceModal`); `DashboardPage.test` and `TemplateThumb` history wording.
- Removed a few comments that only repeated the next line (`LoginForm` and its test, `SignupForm.test`, `MoveFormModal` and its test).
- Marked "Not built yet in the backend": the stage name snapshot on a report job (`ReportJobRow`), same as the earlier services and types groups.
- Disable comments, reasons added: `LoginForm` `react-hooks/refs`, `AuthorAvatar`, `ProductMockup` (two), `Wordmark` (three).
- Disable comments, confirmed as "reason above": `FormAccessPanel` and `InviteMembersModal`.
- Disable comments left: `LoginForm` `react-hooks/set-state-in-effect` and `BlogCard` `no-img-element` (the code does not make the reason certain). In `UserProfileDropdown` the comment above is not the reason: it explains `referrerPolicy` only.
- Left unchanged, unsure: `ReportJobsList` and `ReportJobRow` still point to `docs/status/fix-log.md`, as does `ReportsView`; that file is not in this checkout (`docs/` is ignored by git).
- Left unchanged, unsure: `ReportJobsList` says the backend "has been observed" to drop scope fields on finished jobs. The current backend sends them under `filters`; the old observation cannot be checked.
- Left unchanged: `AddWidgetDrawer` "Looks that are no longer offered" (it explains why they are only hidden); regression notes in tests that say what "used to" happen; `WorkspaceSidebar.test` test name "BE 0.1 not yet shipped" is code.
- `ExportMark.tsx` starts with an empty line, which the apply script drops.

### Findings (code not changed)

- `components/workspaces/CreateWorkspaceModal.tsx` is not imported anywhere in `src` (its `onCreated` prop included).
- `ReportsView`: no caller passes `embedded`.
- `TemplateFormSheet`: no caller passes `compact`.
- `PersonalShell`: the collapsed-sidebar route pattern still lists `scores`, which now redirects to the inbox.
- `WorkspaceSidebar.test`: the "pages that do not exist" test only checks the old names "Analytics" and "Reports", so it can hardly fail.

