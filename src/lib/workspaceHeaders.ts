/**
 * Every workspace-scoped service call needs an explicit workspace indicator, the
 * `x-workspace-slug` header. This is the one shared helper for it, so no service invents its own.
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
