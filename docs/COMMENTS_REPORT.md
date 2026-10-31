# Comments report: frontend (Step 0, nothing changed)

Branch `chore/comments-cleanup-frontend`, from `main` at `5a6c125`. **No source file was changed.** No other open frontend branch touches `src`, so no file has to be left alone.
Date: 31 Oct 2026. The backend is not covered here: it waits until all backend branches are merged.

## 1. How the comments were counted

Every comment was found with the TypeScript compiler (so `//` inside a string, a URL, a regex or JSX text is never counted) over the **1,278 tracked** `.ts`, `.tsx`, `.js` and `.mjs` files (generated files, `.d.ts` and `public/` left out). A comment is a `//` line, a `/* */` block or a `/** */` block; a run of `//` lines counts as one comment per line. The kind is a **heuristic sort** (rules in `comments-scan.js`, kept outside the repo): it is good for counting, not proof. Nothing is removed until the owner answers section 4.

Not in the numbers: `qa-run/`, `qa-run-2/`, `qa-run-3/` and `.next-gatebuild/` exist in the working folder, are **not tracked** (git ignores them) and were skipped. They are leftover QA output on this machine and can be deleted by hand.

## 2. Counts

| | Value |
|---|---|
| Comments | **6,538** (5,266 in app code, 1,272 in tests and e2e) |
| Comment lines | 8,839 of 121,131 lines in the scanned files (7.3%) |
| Files with at least one comment | 1,020 of 1,278 |

By kind:

| Kind | All | App code | Tests and e2e | Remove? |
|---|---|---|---|---|
| explanatory (explains a reason or behaviour) | 4,376 (66.9%) | 3,544 | 832 | **keep** |
| JSDoc / TSDoc | 1,465 (22.4%) | 1,187 | 278 | **keep** |
| short, possibly restating the code | 165 (2.5%) | 104 | 61 | needs your answer (group C) |
| sprint or QA tag, nothing else | 146 (2.2%) | 127 | 19 | needs your answer (group A) |
| decoration banner (`// ─── Mocks ───`) | 112 (1.7%) | 75 | 37 | needs your answer (group D) |
| change-log wording ("used to", "no longer", "bug fixed", dates) | 103 (1.6%) | 74 | 29 | needs your answer (group B) |
| a reason **plus** a sprint or QA tag | 77 (1.2%) | 64 | 13 | needs your answer (group A) |
| empty (`//` alone) | 43 (0.7%) | 43 | 0 | needs your answer (group E) |
| tool directive (`eslint-disable`, `@ts-*`, `/// <reference>`) | 26 (0.4%) | 25 | 1 | **keep** |
| directive without a reason | 18 (0.3%) | 18 | 0 | **keep**, listed in section 5 |
| commented-out code | 4 (0.1%) | 2 | 2 | none real (see below) |
| TODO / FIXME | 3 | 3 | 0 | **keep**, listed in section 5 |
| debug notes (`// test`, `// here`, `// temp`) | **0** | | | nothing to remove |

* **Commented-out code: none.** The four hits are false positives: `/// <reference types="google.maps" />` and `/// <reference types="vitest/globals" />` (directives, keep), "September (0-indexed)" and "busiest = 6 + 11" (prose in tests, keep).
* **Debug notes: none.**
* The earlier dead-code clean-up already took out what the first four rules in the task describe. What is left to decide is wording style, not leftover code.

By folder (comments): `src/lib` 776 · `__tests__/components` 536 · `src/components/responses` 442 · `src/services` 431 · `src/components/form-builder` 402 · `src/types` 394 · `src/components/ui` 356 · `src/components/analytics` 246 · `src/components/public-form` 240 · `e2e` 227 · `shared` 192 · `src/components/workspaces` 191 · `src/hooks` 179 · `src/components/settings` 174 · `__tests__/lib` 157 · `__tests__/app` 141 · `src/app/(user)` 136 · `src/app/w` 106 · `src/components/forms` 100 · `src/store` 80 · the rest under 80 each.

Top 20 files by number of comments (comments / lines):
`src/types/form.ts` 122/368 · `shared/types/insights-search-notifications.ts` 95/212 · `src/components/public-form/PublicFormShell.tsx` 85/733 · `shared/types/charts-v2.ts` 68/152 · `src/lib/queryKeys.ts` 68/242 · `src/store/builderStore.ts` 68/715 · `src/lib/authContext.tsx` 66/265 · `__tests__/components/responses/ResponseDrawer.test.tsx` 64/896 · `src/components/responses/ResponseDrawer.tsx` 62/681 · `src/services/forms.ts` 60/247 · `src/services/responses.ts` 58/257 · `src/lib/roles.ts` 55/205 · `src/app/api/backend/[...path]/route.ts` 53/255 · `src/components/workspaces/PersonalShell.tsx` 48/191 · `__tests__/store/builderStore.test.ts` 42/452 · `src/types/response.ts` 42/202 · `src/components/analytics/AnalyticsView.tsx` 39/505 · `src/components/form-builder/useBuilderAutosave.ts` 39/275 · `src/lib/chartBuilder.ts` 39/388 · `src/components/workspaces/WorkspaceSidebar.tsx` 36/136.

## 3. The share that looks stale or unsure

The groups A to E below add up to **646 comments, 9.9% of all** (A 223, B 103, C 165, D 112, E 43). That is at the 10% line, and several groups conflict with the rules in the task, so I stop here for your answer instead of choosing a reading myself.

## 4. Questions for the owner (the groups)

**A. Sprint and QA tags (223: 191 in app code, 32 in tests).** Examples: `next.config.ts:126` "Static art in /public served with max-age=0 was revalidated on every page load (QA A11-008)." · `shared/types/insights-search-notifications.ts:105` "completionRate - ONE meaning on every endpoint (OQ-3)." · test comments such as "QA D5-002: the single-response download went out under the personal scope too…". Most carry a real reason; the tag is the change-log part.
*Proposal:* keep the sentence, delete only the tag ("QA A11-008", "Sprint 13 (CF2.7):"), and delete the comment when nothing but the tag is left. *Alternative:* keep them all because the tags are how the team finds the ticket.

**B. Change-log wording (103: 74 in app code, 29 in tests).** Examples: "Real bug found and fixed (22 Sep 2026): the raw backend `sharedBy` used to be a userId…" · "Real backend shape, confirmed live 12 Aug 2026 — flat completed/in_progress/new fields". In **tests** these explain what the test proves, which the task says to keep.
*Proposal:* app code: remove the history words and dates, keep the reason; **tests: keep all**.

**C. Short comments that may restate the code (165: 104 in app code, 61 in tests).** Examples: "Stat cards", "Pinned form title", "Quick actions", "Toggle to text", "Export", "Customize". Many are labels for a block in a long test; a few repeat the next line.
*Proposal:* remove only those where the next line says the same in code; I list every one before removing, and tests are left alone.

**D. Decoration banners (112: 75 in app code, 37 in tests).** Almost all are section dividers such as `// ─── Mocks ───────` and `// ─── Property 8: Password Visibility Toggle Round-Trip ───`.
*Proposal:* remove the pure lines of dashes or equals signs; for dividers that carry a title, keep the title as a plain `// Mocks` comment. Or keep them all (they structure long test files).

**E. Empty `//` lines (43, all in app code).** They are the blank line inside a multi-line `//` comment block (paragraph break), for example in `src/app/layout.tsx:49`.
*Proposal:* leave them; removing one only changes how a comment block is laid out. Or remove them if you want them gone.

## 5. What is kept, listed

**TODO / FIXME** (3 lines, 2 TODOs):
* `src/components/settings/DangerZoneSection.tsx:22` "TODO: gate this whole section on workspace role once a real contract exists…"
* `src/components/settings/WorkspaceTab.tsx:58` "TODO: gate the name field read-only per Requirement 5.3 once a real workspace-role contract exists…"
* **Both look stale, and point to a possible bug.** They say "every signed-in user is the sole owner of their one workspace today, so there's nothing real to gate". Workspaces now have members with roles (`src/lib/roles.ts` maps owner, admin, member, editor and viewer to the labels Owner, Admin, Editor and Reviewer), but neither component checks a role: the Danger Zone (export and delete the workspace) and the workspace name field are drawn for every member. The backend enforces permission, so a member without it gets a 403 after clicking; the screen still offers the button. I did not change them. Please decide whether the TODO is real open work (keep) or the gate should be built.

**Directive comments without a reason (18, not changed):**
`src/app/(standalone)/forms/claim/page.tsx:107` · `src/app/blog/page.tsx:26` · `src/components/auth/LoginForm.tsx:48, 145` · `src/components/dashboard/UserProfileDropdown.tsx:100` · `src/components/form-builder/useBuilderLeaveGuard.ts:25` · `src/components/forms/OwnerMonogram.tsx:38` · `src/components/landing/BlogCard.tsx:27` · `src/components/landing/Wordmark.tsx:13` · `src/components/settings/AvatarUploader.tsx:77` · `src/components/settings/DeleteWorkspaceModal.tsx:69` · `src/components/settings/WorkspaceTab.tsx:76` · `src/components/team/FormAccessPanel.tsx:73` · `src/components/team/InviteMembersModal.tsx:49` · `src/components/ui/Avatar.tsx:46` · `src/components/ui/charts/Interactive.tsx:120` · `src/hooks/useReveal.ts:17` · `src/hooks/useScrollProgress.ts:18`.
Twelve are `react-hooks/set-state-in-effect` or `react-hooks/refs`; six are `@next/next/no-img-element`. Several have an explanatory comment on the line above rather than on the directive itself; I did not check each one.

## 6. Plan after your answer

One commit per folder (`src/lib`, `src/services`, `src/types`, `src/hooks`, `src/store`, `src/app`, one per `src/components/<feature>`, then `shared`, `scripts` and the root configs), each followed by the proof script and the gate. The proof compiles every changed file before and after with `removeComments: true` and requires identical output; the script stays outside the repo. Baseline for the gate (31 Oct 2026, main): type-check and lint clean, 456 test files and 4,115 tests, build route table saved, e2e 209 of 209. The last commit sets the version in `package.json`: it is **2.1.0** today, which is already 2.x, so I will not change it and will tell you the value.

## 7. Not checked

Stale comments that no longer match their code can only be found by reading each one. I checked the TODOs and a sample of "no longer / used to" wording; I did not read all 6,538. Comments inside `*.generated.*` and `.d.ts` files, JSON, YAML, CSS and Markdown were out of scope.
