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
 * `scope` is `'personal'` for the personal shell (no header — the backend's own default-caller
 * resolution applies, same as today) or a workspace slug for `/w/[slug]/...` routes.
 */
export function workspaceHeaders(scope: string | undefined): Record<string, string> | undefined {
  return scope && scope !== 'personal' ? { 'x-workspace-slug': scope } : undefined;
}
