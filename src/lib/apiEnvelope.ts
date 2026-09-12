// Extracted from src/services/workspaces.ts (Sprint 9, design.md §12) — same function body, new
// shared home so team.ts/invitations.ts/formAccess.ts/shared.ts import one implementation rather
// than four copies. No behavior change from the original.
export function unwrapEnvelope<T>(raw: unknown, namedKey: string): T {
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (typeof obj[namedKey] !== 'undefined') return obj[namedKey] as T;
  }
  return raw as T;
}
