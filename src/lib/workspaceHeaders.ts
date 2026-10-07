/**
 * Sprint 12 (inbox-collaboration), requirements.md §7.1 pre-flight / OQ-1, design.md §12.
 *
 * Every Inbox-family service call needs an explicit workspace indicator — Sprint 11's audit
 * flagged that `responses`/`analytics`/`reports`/`dashboard` send none at all (queryKeys.ts's own
 * bucket-(c) comment), unlike `formsService.getForms()` (src/services/forms.ts), the one caller
 * that already does this correctly via `x-workspace-slug`. This is that same pattern extracted
 * into one shared helper, so no new service reinvents it (design.md §12: "reusing the pattern
 * already documented in services/forms.ts, so no service invents its own").
 *
 * `scope` is `'personal'` for the personal shell or a workspace slug for `/w/[slug]/...` routes.
 *
 * Real bug found and fixed here (30 Sep 2026): this used to send NO header at all for
 * `'personal'`, on the assumption that omitting it meant "no workspace" to the backend. It does
 * not — `permission.middleware.ts`'s `requirePermission` falls back to the caller's own
 * membership/default workspace whenever no workspace is named at all, so a user who is a member
 * of any workspace saw that workspace's data silently served under the Personal shell (observed:
 * a QA Workspace response appearing in a different account's Personal Responses list). The
 * middleware already recognises an explicit `'personal'` value on this exact header as "truly no
 * workspace" (`isPersonalSignal`) and skips the fallback — so Personal now sends that value
 * instead of omitting the header, the same way `listForms`'s `isExplicitPersonal` check already
 * relies on it (`form.controller.ts`).
 */
export function workspaceHeaders(scope: string | undefined): Record<string, string> {
  return { 'x-workspace-slug': scope && scope !== 'personal' ? scope : 'personal' };
}
