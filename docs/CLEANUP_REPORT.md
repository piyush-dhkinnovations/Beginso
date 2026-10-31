# Cleanup report: frontend (Step 0, inventory only)

Branch `chore/cleanup-frontend`, from `main`. **No source file was changed.** Nothing below is deleted until the owner approves the list.
Date of the inventory: 31 Oct 2026.

## 0. How the evidence was gathered, and what was not done

| Check (section 2 of the task) | Done in Step 0 | Note |
|---|---|---|
| 1 Static search (`git grep` of path, name, exported names) | yes | |
| 2 Tool report | **partly** | `knip` could not be installed: the registry was unreachable from the build machine (`ETIMEDOUT`). Replaced by a small import-graph script (entry points = Next.js convention files, root configs and scripts; tests counted separately). Treat its output as suspects only. Re-run with `knip` once the network is back. |
| 3 Entry points tools miss (`package.json` scripts, `.github`, configs, docs, `next.config.ts`) | yes | |
| 4 Framework conventions | yes | `error`, `not-found`, `global-error`, `robots`, `sitemap`, `dev/ui/*` pages are used by Next.js without an import. |
| 5 Behaviour check (remove, run the gate) | **no, Step 1** | |
| 6 History (`git log`) | yes | last-commit date in each row |
| 7 Runtime check (route table before and after) | **no, Step 1** | The `next build` route table is saved as the baseline at the start of Step 1. |

Not checked: the Admin repo (read-only here; not part of this report), the `docs/` files for stale content, CSS and Tailwind leftovers (no tool available), image dimensions.

## 1. Ask the owner (decide these first)

| # | Path | Why it needs the owner |
|---|---|---|
| 1 | `src/components/form-builder/useBuilderFormMutations.ts` (79 lines) | Imported only by its test. **Touched 16 Oct** ("a stale tab no longer silently overwrites a newer form"). Either the builder should use it (a missed wire-up) or it is dead. |
| 2 | `src/components/workspaces/CreateWorkspaceModal.tsx` (96 lines) | Imported only by its test; the only other mentions are comments. **Touched 14 Oct** (storage and workspace quota UX). Is workspace creation done somewhere else now? |
| 3 | `src/components/landing/BlogSection.tsx` (40 lines) | Imported only by its test. Last touched 7 Oct. The blog covers in `public/blog/covers/` are used by `BlogCard`, so the blog itself is live. |
| 4 | `src/lib/mocks/analyticsMocks.ts`, `reportsMocks.ts`, `responsesMocks.ts` | A mock layer. **No app code imports it** (checked `src` and `e2e`); only 6 test files use it as fixtures. Not a fallback for the real API. Proposal: keep, and move to `__tests__/fixtures/` in Step 4. |
| 5 | `illustrations-src/_unused/` (11 SVG) | The folder is named "unused" and `scripts/build-illustrations.mjs` mentions it in a comment only. Archive of artwork not shipped. Delete, or keep as design source? |
| 6 | `scripts/screenshot-mvp.mjs` | One-off screenshot tool for the MVP inventory. Not in `package.json`, no CI use, last touched 17 Aug. Needs real login credentials by environment variable. |
| 7 | `@eslint/eslintrc` (devDependency) | Only named in `package.json`. `eslint.config.mjs` does not import it. It may still be needed as a peer of the Next ESLint config; the gate decides in Step 2. |

## 2. Files and folders

| Path | What it is | Why suspected | Checks | Last commit | Verdict | Risk |
|---|---|---|---|---|---|---|
| `tmp-dbg.mjs` (13 lines) | root scratch script | `tmp-` name, root level | 1, 3: no reference anywhere; contains no credential words | 2026-10-06 | **delete** | none |
| `tmp-dbg2.mjs` (8 lines) | same | same | same | 2026-10-06 | **delete** | none |
| `tmp-drive.mjs` (254 lines) | same | same | same | 2026-10-06 | **delete** | none |
| `scripts/screenshot-mvp.mjs` | MVP screenshot tool | no caller | 1, 3: only its own header mentions it | 2026-08-17 | ask the owner (item 6) | low |
| `illustrations-src/_unused/*.svg` (11) | unshipped artwork | folder name | 1, 3: no import | see git | ask the owner (item 5) | low |
| `illustrations-src/*.svg` (18 others) | source for `build-illustrations.mjs` | looked unused | 1, 3: read by the script and its test | 2026-10-24 | **keep** | |
| `scripts/build-illustrations.mjs`, `generateFormIcons.mjs` (`npm run generate:form-icons`), `write-build-info.mjs` (`prebuild`), `formIconSet.json` | build helpers | | 3: `package.json` and tests | 2026-10 | **keep** | |
| `shared/types/*` | types shared with other repos | looked unused | 1: imported by `settings`, `hooks`, `services/charts` | | **keep** | |
| `public/email/beginso-logo.png` | email logo | no reference in this repo | 3: the **backend** default is `APP_URL` + `/email/beginso-logo.png` (`.env.example` in the backend) | | **keep** | removing it breaks the logo in every email |
| `public/blog/covers/*.png`, `public/avatars/*.svg`, `favicon*.svg`, `name-*.svg`, `embed.js` | public assets | | 1: used by `BlogCard`, `onboarding`, `people.ts`, `next.config.ts`, `globals.css`, embed code | | **keep** | |
| `src/app/dev/ui/**`, `src/components/dev/**` | internal UI gallery | demo pages | 4: every page returns `notFound()` when `NODE_ENV=production` | 2026-09-03 | **keep** (report) | |
| `src/app/error.tsx`, `not-found.tsx`, `global-error.tsx`, `robots.ts`, `sitemap.ts` | framework files | graph flags them | 4: Next.js uses them without an import | | **keep** | false positives |
| `src/lib/mocks/*` | test fixtures | see item 4 | | 2026-10-29 | ask the owner (item 4) | low |
| the three components in items 1 to 3 | | | | | ask the owner | medium (recently touched) |

No `*.bak`, `*.old`, `*.orig`, `*copy*`, screenshots, traces, videos, HAR, logs, CSV or dumps are tracked. **No tracked file is over 200 KB.** `.gitignore` does not need additions.

## 3. Dependencies (candidates only; Step 2 proves them with the gate and the build)

| Package | Evidence | Verdict |
|---|---|---|
| `tw-animate-css` 1.4.0 | named only in `package.json` and the lockfile; not imported in any CSS, config or source file | **delete** (Step 2) |
| `@eslint/eslintrc` 3.3.7 | see item 7 | ask the owner |
| `@testing-library/dom` | peer dependency of `@testing-library/react` | keep |
| `@types/google.maps`, `@types/leaflet`, `@types/node`, `@types/qrcode`, `@types/react`, `@types/react-dom` | type packages have no imports by design | keep |

Duplicate-purpose packages (two date, HTTP, chart or form libraries) were **not yet checked**; Step 2 does it with the dependency list in hand.

## 4. Dead code inside live files (Step 3)

* 227 exported names appear nowhere else in the repo; **88 are `*Props` types** and 139 are other names (constants, small helpers, types). Examples: `formatBucketLabel`, `chartResponsesHref`, `STEP_HINTS`, `STEP_LABELS`, `recommendedLayout`, `isFormStale`, `parsePolicyMarkdown`, `csvCell`, `coercePrefill`, `messageForStatus`, `focusFirstInvalid`.
* Two of them are not even used inside their own file: `isDraftPersistent` in `src/lib/guest/guestDraft.ts` and `useRecentForms` in `src/store/recentFormsStore.ts`. These are the safest to remove first.
* An exported name that is used only inside its own file is **not** dead: only the `export` keyword is unnecessary. Step 3 removes the keyword, not the code, in that case.
* Full list: appendix at the end of this file.
* `console.log` and large commented-out blocks, stale TODO comments, duplicate helpers: **not yet inventoried**; ESLint reports unused imports and variables, and the baseline lint is clean (0 problems).

## 5. Backend endpoints with no known caller

Out of scope for the frontend run. See the backend report.

## 6. Secret scan (names only)

* No `.env*`, `*.pem`, `*.key`, service-account or credential file is tracked, and none was ever added in history (checked with `git log --diff-filter=A`).
* A pattern scan (AWS keys, private-key blocks, GitHub and Slack tokens, `sk_live_`) of every tracked file matched **only** `.gitleaks.toml`, which is the scanner's own rule file (pattern text, not a secret).
* `gitleaks` itself is not installed on this machine, so the history was **not** scanned for secret-shaped content in old commits. The `security` workflow runs gitleaks on every pull request and push.

## 7. Numbers before (main at the start of the work)

| | Value |
|---|---|
| Tracked files | 1,363 |
| Lines in tracked files | 155,140 |
| Size of tracked files | about 11.2 MB |
| Type-check, lint | clean |
| Unit tests | 456 files, 4,115 tests, all pass |
| Build | succeeds; the route table and bundle sizes are saved at the start of Step 1 |
| E2E suite | not run in Step 0 (runs in Step 1 baseline) |

## 8. Proposed Step 1 (after approval)

Delete `tmp-dbg.mjs`, `tmp-dbg2.mjs`, `tmp-drive.mjs`, plus whatever the owner approves from section 1. Then the gate, a build, and a route-table comparison.

---

## Appendix: exported names that appear nowhere else (non-`Props`)

```
src/components/analytics/QuestionBreakdownChart.tsx :: QuestionOptionWithPercentage
src/components/analytics/TrendChart.tsx :: formatBucketLabel
src/components/analytics/WorkspaceSummaryCards.tsx :: WorkspaceSummaryChanges
src/components/analytics/builder/ChartResponsesDrawer.tsx :: chartResponsesHref
src/components/analytics/builder/ChartResult.tsx :: FEW_RESPONSES
src/components/analytics/builder/DrillChart.tsx :: DrillPathList
src/components/analytics/builder/WizardSteps.tsx :: WizardStep
src/components/analytics/builder/wizardState.ts :: STEP_HINTS
src/components/analytics/builder/wizardState.ts :: STEP_LABELS
src/components/analytics/builder/wizardState.ts :: StepId
src/components/dashboard-grid/types.ts :: WidgetConfig
src/components/form-builder/FieldInlineEditor.tsx :: PanelSection
src/components/form-builder/LayoutChooser.tsx :: recommendedLayout
src/components/form-builder/Toolbox.tsx :: FieldGroup
src/components/form-builder/Toolbox.tsx :: FieldTypeConfig
src/components/form-builder/Toolbox.tsx :: GROUP_ICON_COLOR
src/components/form-builder/useBuilderAutosave.ts :: KEEPALIVE_BODY_LIMIT
src/components/form-builder/useBuilderAutosave.ts :: isFormStale
src/components/forms/FormActivityCard.tsx :: FORM_ACTIVITY_PREVIEW_COUNT
src/components/forms/FormIcon.tsx :: IconTile
src/components/guest/DesignDrawer.tsx :: DesignControls
src/components/policy/PolicyMarkdown.tsx :: parsePolicyMarkdown
src/components/public-form/BrandMark.tsx :: LOGO_PX
src/components/public-form/BrandMark.tsx :: logoRadius
src/components/responses/ResponseColumnCell.tsx :: COLUMN_LABELS
src/components/responses/answers/AnswerValue.tsx :: AnswerVariant
src/components/responses/calendar/CalendarGrid.tsx :: MAX_VISIBLE_PER_DAY
src/components/search/SearchResultRow.tsx :: SEARCH_GROUP_ICON
src/components/team/AuditFilters.tsx :: AuditActorOption
src/components/templates/TemplateThumb.tsx :: ThumbVariant
src/components/ui/PageSkeletons.tsx :: ListCardSkeleton
src/components/ui/PageSkeletons.tsx :: TableBlockSkeleton
src/components/ui/SegmentedRadio.tsx :: SegmentedRadioOption
src/components/ui/Toast.tsx :: ToastAction
src/components/workspaces/WorkspaceRoleGate.tsx :: WorkspaceGateRule
src/hooks/useAnalyticsTrend.ts :: UseAnalyticsTrendParams
src/hooks/useInboxFilters.ts :: UseInboxFiltersOptions
src/hooks/useInboxMutations.ts :: BulkOptions
src/hooks/useInboxMutations.ts :: UseInboxMutationsOptions
src/lib/answerKeys.ts :: KeyedField
src/lib/auditActors.ts :: AuditActorSource
src/lib/boardDnd.ts :: CARD_PREFIX
src/lib/boardDnd.ts :: COLUMN_PREFIX
src/lib/chartBuilder.ts :: CHOICE_OP_LABEL
src/lib/chartBuilder.ts :: NUMBER_OP_LABEL
src/lib/chartBuilder.ts :: NamedValues
src/lib/chartBuilder.ts :: TypeChoice
src/lib/chartBuilder.ts :: conditionComplete
src/lib/chartOptions.ts :: ChartFieldKind
src/lib/chartOptions.ts :: TYPES_BY_KIND
src/lib/chartOptions.ts :: isChartableField
src/lib/chartOptions.ts :: isTimeType
src/lib/csv.ts :: csvCell
src/lib/dashboardPresets.ts :: DashboardPreset
src/lib/dashboardPresets.ts :: DashboardPresetId
src/lib/dateRange.ts :: EffectiveDateRange
src/lib/embed/buildEmbedSnippet.ts :: AdvancedRow
src/lib/embed/buildEmbedSnippet.ts :: ButtonSize
src/lib/embed/buildEmbedSnippet.ts :: PrefillRow
src/lib/embed/embedParams.ts :: EmbedOptions
src/lib/embed/prefill.ts :: PrefillCheck
src/lib/embed/prefill.ts :: coercePrefill
src/lib/embed/prefill.ts :: matchPrefillField
src/lib/errorHelpers.ts :: FriendlyErrorOptions
src/lib/errorHelpers.ts :: messageForStatus
src/lib/fieldDisplay.ts :: IMAGE_MIME_TYPES
src/lib/fieldDisplay.ts :: ImageSettings
src/lib/fieldDisplay.ts :: UrlSettings
src/lib/focusField.ts :: focusFirstInvalid
src/lib/formDraft.ts :: FormDraft
src/lib/formVisual.tsx :: FormVisual
src/lib/formatters.ts :: RespondentIdentity
src/lib/guest/blobStore.ts :: BlobStore
src/lib/guest/claim.ts :: ClaimResult
src/lib/guest/funnel.ts :: FunnelEvent
src/lib/guest/guestDraft.ts :: IMAGE_MAX_BYTES
src/lib/guest/guestDraft.ts :: SaveResult
src/lib/guest/guestDraft.ts :: removeImage
src/lib/guest/guestDraft.ts :: storedDraftVersion
src/lib/guest/instantiateTemplate.ts :: InstantiatedTemplate
src/lib/inboxFilters.ts :: ParsedInboxFilters
src/lib/inboxFilters.ts :: normalizeGranularity
src/lib/layoutPresets.ts :: LayoutPresetInfo
src/lib/notificationGroups.ts :: NotificationGroup
src/lib/notificationGroups.ts :: NotificationGroupLabel
src/lib/responseAnswers.ts :: isTopImage
src/lib/responseView.ts :: ArrangeOptions
src/lib/responseView.ts :: ArrangedAnswers
src/lib/responseView.ts :: LONG_ANSWER_CHARS
src/lib/roles.ts :: CapabilityGroup
src/lib/roles.ts :: CapabilityItem
src/lib/shrinkImage.ts :: UPLOAD_LIMIT_BYTES
src/lib/statusColors.ts :: FormStatusKey
src/lib/storageUsage.ts :: StorageLevel
src/lib/storedDateRange.ts :: StoredRange
src/lib/templatePreview.ts :: templateLook
src/lib/theme.ts :: isDarkVariant
src/lib/workspaceServer.ts :: ResolveWorkspaceResult
src/services/chartBuilder.ts :: SaveChartPayload
src/services/dashboardLayout.ts :: SavedLayout
src/services/forms.ts :: FormsSortField
src/services/forms.ts :: sanitizeBranding
src/services/publicForm.ts :: EmailCodeResult
src/services/publicForm.ts :: FormSchemaResult
src/services/respondent.ts :: LinkViewResult
src/services/stages.ts :: StagePayload
src/services/workspaces.ts :: CreateWorkspacePayload
src/store/builderStore.ts :: BuilderState
src/store/recentFormsStore.ts :: RecentForm
src/store/recentFormsStore.ts :: useRecentForms (not even used inside its own file)
src/store/recentFormsStore.ts :: useRecentFormsStore
src/types/chartBuilder.ts :: ChoiceOp
src/types/chartBuilder.ts :: FilterOp
src/types/chartBuilder.ts :: NumberOp
src/types/chartBuilder.ts :: QueryFocus
src/types/chartBuilder.ts :: QueryWarning
src/types/dashboard.ts :: DashboardActivityForm
src/types/form.ts :: BaseField
src/types/form.ts :: ChoiceField
src/types/form.ts :: CurrencyField
src/types/form.ts :: DateConstraints
src/types/form.ts :: FileUploadField
src/types/form.ts :: ImageUploadField
src/types/form.ts :: LegacyLayout
src/types/form.ts :: NumberConstraints
src/types/form.ts :: SimpleField
src/types/form.ts :: TextConstraints
src/types/form.ts :: UrlField
src/types/note.ts :: NoteMention
src/types/publicForm.ts :: UploadStatus
src/types/responseSetup.ts :: FormStage
src/types/responseSetup.ts :: FormStages
src/types/responseView.ts :: ResolvedResponseView
src/types/responseView.ts :: ResponseViewSource
src/types/score.ts :: ScoreEntry
src/types/search.ts :: FormSearchResult
src/types/search.ts :: MemberSearchResult
src/types/search.ts :: ResponseSearchResult
src/types/search.ts :: TemplateSearchResult
```

---

## Step 1 and Step 2 results (31 Oct 2026)

**Step 1** (branch `chore/cleanup-frontend-step1`, commit `9322076`): deleted `tmp-dbg.mjs`, `tmp-dbg2.mjs`, `tmp-drive.mjs`, `illustrations-src/_unused/` (11 SVG), `scripts/screenshot-mvp.mjs`. 15 files, 542 lines.

**Step 2** (branch `chore/cleanup-frontend-step2`): removed the dependencies `tw-animate-css` and `@eslint/eslintrc` (2 lines in `package.json`, 227 lines out of the lockfile, no version changed, nothing added). `node_modules` 974 MB to 971 MB. Lint, type-check and the build pass without `@eslint/eslintrc`, so it stays removed. `knip` (run once the network was back) reports exactly these two as unused and no others.

**Gate against the baseline (same machine, same day):**

| | Before | After step 1 | After step 2 |
|---|---|---|---|
| Type-check, lint | clean | clean | clean |
| Unit tests | 456 files, 4,115 tests | same | same |
| `next build` route table | 88 lines | identical | identical |
| E2E | 198 passed, **11 failed** | same 11 fail | same 11 fail |

The 11 failing e2e tests (10 in `chart-builder.spec.ts`, 1 in `public-form-font.spec.ts`) **already failed before any change**. They are unrelated to this cleanup and need their own look (the log shows hydration mismatch errors).

**Duplicate-purpose libraries:** none. One HTTP client (`axios`), one form library (`react-hook-form`), one animation source (CSS only), no date or chart library. `MapWidget` uses both Google Maps (script loaded with a key) and Leaflet, which is a deliberate fallback: report, keep. `lucide-react` is the icon set; `@iconify-json/streamline-ultimate-color` is only used by `scripts/generateFormIcons.mjs`: keep.

**Other `knip` findings (report only, nothing changed):**
* Unlisted dependencies: `axe-core` (used by five e2e specs) and `postcss` (named in `postcss.config.mjs`) are used but not declared in `package.json`; they work today because another package brings them in. Declaring them is a dependency change, so it needs your approval.
* "Unused files" flagged by knip: `e2e/mockServer.ts`, `e2e/mocks/publicFormMocks.ts` (loaded by Playwright config or specs), `public/embed.js` (served to embedders), `scripts/build-illustrations.mjs` (run by hand and by its test), three files in `shared/types/`. All look like false positives; not deleted.
* Unused exported types: 198 (mostly `*Props`): Step 3 does not touch exports.
