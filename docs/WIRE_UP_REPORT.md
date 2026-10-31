# Possible missed wire-ups (frontend)

Written before Step 3 of the cleanup. **Nothing was changed.** Each name was flagged because no other file imports it. For each one: where the live app does the same job, and what a user would experience if it were a real gap.

## Summary

Eight of the ten are **live code**: the name is used inside its own file by a function that live screens call. Only the `export` keyword is extra, so there is no wire-up to fix. The other two are **not used by any screen**, and in both cases the live app does the job elsewhere. No real gap was found; one point needs the owner's confirmation (a manual "Close form" action, see row 8).

| # | Name | Defined in | Where the live app does the job | Gap for a user? |
|---|---|---|---|---|
| 1 | `sanitizeBranding` | `src/services/forms.ts` | Called by `formsService.updateForm` on every save that carries branding (the builder autosave and the guest claim flow both go through it). | No |
| 2 | `csvCell` | `src/lib/csv.ts` | Called by `toCsv`, which the chart full-screen "download CSV" uses (`ChartFullScreen`). It guards against spreadsheet formula injection. | No |
| 3 | `isFormStale` | `src/components/form-builder/useBuilderAutosave.ts` | Used twice inside `useBuilderAutosave` (marks the builder stale when another tab saved a newer version). The builder edit page uses that hook. | No |
| 4 | `coercePrefill`, `matchPrefillField` | `src/lib/embed/prefill.ts` | Used by `resolvePrefill` (public form, `PublicFormShell`) and `checkPrefillRow` (embed studio and config panel). Prefill from the URL works through them. | No |
| 5 | `focusFirstInvalid` | `src/lib/focusField.ts` | Called by `focusFirstInvalidSoon`, which the public form calls after a failed submit to move focus to the first error. | No |
| 6 | `messageForStatus` | `src/lib/errorHelpers.ts` | Called by `getFriendlyErrorMessage`, used in about 37 files for every friendly error toast. | No |
| 7 | `conditionComplete` | `src/lib/chartBuilder.ts` | Called by `filtersComplete`, which the chart wizard uses to show "Fill in every filter or remove it." | No |
| 8 | `useBuilderFormMutations` | `src/components/form-builder/useBuilderFormMutations.ts` | **Not used by any screen.** It held the builder's "Close form" and "Delete form" flows. Commit `4c91d21` (21 Oct, "no three-dot menu in the builder header") removed the menu that used it, so this is what is left of that change. **Delete** is still available from the forms list (`useFormsMutations`, `FormsDialogs`, delete goes to Trash since Sprint 13). **Close** has no replacement: `formsService.closeForm` is called by nobody else. | See below |
| 9 | `CreateWorkspaceModal` | `src/components/workspaces/CreateWorkspaceModal.tsx` | **Not used by any screen.** Creating a workspace is the full page `/workspaces/new` (`CreateWorkspacePage`), reached from the workspace list and the sidebar. That page also shows the workspace limit and blocks creation at the limit (`atLimit`); the modal has no quota handling. | No |

(The task listed ten names; `coercePrefill` and `matchPrefillField` are one row, so the table has nine rows.)

## Row 8: what a user would experience

* A user can **no longer close a form by hand** from the builder. They can still **unpublish** it (back to draft, the public link is kept; publishing again undoes it), **archive** it, or **delete** it (to Trash).
* A form can still reach the status "closed" on the backend side (not verified from this repo which rules set it), and the overview page then offers "Re-publish form". So the closed state exists, only the manual trigger is gone.
* If a manual **Close** is still wanted ("stop taking responses but keep the form published-looking"), that is a product decision: the hook, `closeForm` and the close modal text are all ready to be reconnected. If it was removed on purpose together with the menu, the hook and `formsService.closeForm` are dead and can go in a later cleanup.
* Per the owner's decision, `useBuilderFormMutations` and `CreateWorkspaceModal` **stay** for now.

## Backend answers (read-only checks, nothing changed)

Read from `Beginso-Backend` at commit `6f6f9e5` (main). File and function names below.

### 1. What sets a form to "closed", and can a user close it by hand?

Automatic, four places, all in `src/services/form.service.ts`:

| What | Where | Detail |
|---|---|---|
| **Close date passed** | `closeExpiredForms` (called by the background job `closeExpiredForms` in `src/services/backgroundJobs.ts`, on a timer) | `published` forms whose `settings.closeDate` is in the past become `closed`. Database only, no email. |
| **Response limit reached** | the submit path of the public form (`settings.responseLimitEnabled` and `settings.responseLimit`) | When the count reaches the limit the form is set to `closed`. If two submissions race past the limit, the extra one is deleted and the submitter gets 403 "no longer accepting responses". Test submissions never count. |
| **Public read of a form that is already over its limit or past its close date** | respondent lookup in `form.service.ts` (the `allowWrite` branch) | A public GET does not write; a submit attempt does, and flips the stored status to `closed`. |
| **Manual: the close route** | `POST /api/forms/:formId/close`, `FormService.closeForm`, permission `forms:publish` | The backend still has it. **No screen in the frontend calls it** (`formsService.closeForm` has no caller outside the unused `useBuilderFormMutations`). |
| **Manual: PATCH with a status** | `PATCH /api/forms/:formId` (`patchFormSchema` allows `status: "closed"`, `form.controller.ts`; it records the event `form.close`) | Accepted by the backend. I did **not** check whether any screen sends `status: "closed"` this way; the builder's publish and unpublish flows use their own routes. |

So today a user closes a form in practice by setting a **close date** or a **response limit** in the form settings, or by unpublishing. There is no "Close now" button.

### 2. Does the backend CSV export escape formula cells? Yes.

`csvCell` in `src/utils/reportExport.ts` prefixes an apostrophe to any cell that starts with `=`, `+`, `-`, `@`, tab or carriage return, **except** plain numbers such as `-5` or `+91...` (tested by `src/__tests__/report_export_helpers.test.ts`). The only CSV writer, `report.service.ts` (the header row at line 215 and every data row at line 254), runs every cell through `csvCell`. The frontend has its own copy in `src/lib/csv.ts` (chart download) with the same guard but **without** the number exception, so a negative number in a downloaded chart CSV becomes `'-5` (text in a spreadsheet). That is a small inconsistency, not a security gap.

There is **no gap** here: a respondent who types `=HYPERLINK(...)` into an answer will see it as text in the exported file.

### 3. Does the backend validate and sanitize branding on form update? Yes, it does not trust the frontend.

`brandingSchema` in `src/validations/form.validator.ts`, applied by `createFormSchema` and `patchFormSchema` (`form.controller.ts` calls `.parse(req.body)` before anything is saved):

* Colors (`primaryColor`, `iconColor`, `backgroundColor`): hex only (`#rgb` or `#rrggbb`).
* Image addresses (`logoUrl`, `coverImageUrl`, `backgroundImageUrl`): `safeImageUrl`: max 2048 characters, only `http(s)` or this API's own `/api/upload/file/` path, no credentials, and none of the characters `" ' ( ) < > \` or whitespace, so they cannot break out of `url("...")` or an attribute.
* Choices (button style and radius, fonts, type scale, card style, spacing, form width, logo size and the like): fixed `z.enum` lists.
* Text: `bannerText` is trimmed and capped at 500 characters; each of up to five `bannerLinks` has a label up to 60 characters and a URL that must be a plain `http(s)` address with no credentials or breakout characters; `iconName` must match `^[a-z0-9-]{2,40}$`.
* **There is no custom-CSS field.** The schema is a plain `z.object`, so unknown keys are dropped, not stored.
* New forms copy the workspace branding defaults through `pickBrandingDefaults` (`form.service.ts`), which only passes an allow-list of keys.

What it does **not** do: `bannerText` is stored as typed (no HTML stripping). That is safe only as long as the public form shows it as plain text, which the validator's comment states and I did not re-verify in the frontend render code.
