// Thin, derived shapes for the V2 multi-workspace UI (sprint-8-workspaces-context). Does not
// redefine shared/types/Workspace.ts — that file is the contract the backend publishes against
// (see shared/types/README.md) and stays the single source of truth for the Workspace shape
// itself.
import type { Workspace, Role } from '../../shared/types';

export type { Workspace, Role };

// GET /api/workspaces response item — a Workspace plus the caller's own role in it
// (requirements.md §13). Not to be confused with src/types/settings.ts's WorkspaceSettings,
// which describes the older singular /workspaces/current settings resource (branding, logo,
// notification prefs) — a different API surface that happens to share a noun (design.md §13).
export interface WorkspaceListItem extends Workspace {
  role: Role;
}

// Where a form is being created into, moved to, or listed from (requirements.md §7.7, §7.9,
// §7.10) — one shape covers both "destination for a mutation" and "context for a query key",
// since they're the same discriminated union either way.
export type FormDestination = { type: 'personal' } | { type: 'workspace'; workspaceId: string };
export type FormsContext = FormDestination;
