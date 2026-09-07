import type { Workspace } from '@/types/workspace';

export type ResolveWorkspaceResult =
  | { ok: true; workspace: Workspace }
  | { ok: false; status: 403 | 404 };

// Server-only. Mirrors proxy.ts's own hasValidSession() — the only existing precedent in this
// codebase for an authenticated server-side call. Every service under src/services/ is
// client-side only (axiosInstance's baseURL is the browser-relative '/api/backend'), so there
// was no established pattern to reuse for a Server Component's own fetch; this is the smallest
// extension of the one that does exist rather than a new one.
//
// GET /api/workspaces/:id is confirmed 🟢 LIVE as of 07 Sep 2026 (Beginso-Report/API_CONTRACT.md,
// "Sprint 8 — Workspaces & Context Contracts") — it explicitly accepts either an ObjectId or a
// lowercase slug in the :id segment, so passing the slug straight through (as this always did) is
// correct, not a guess. Confirmed error shape: 403 FORBIDDEN_WORKSPACE_ACCESS on a foreign
// workspace, 404 on a nonexistent one — matches this function's existing 403/404 handling.
// Still not independently re-verified against live backend code from this repo (backend is a
// separate repo); resting on API_CONTRACT.md's evidence, same as every other Phase 0 status note
// in this sprint's tasks.md.
export async function resolveWorkspaceBySlug(
  slug: string,
  token: string | undefined
): Promise<ResolveWorkspaceResult> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL;
  if (!apiBase || !token) return { ok: false, status: 404 };

  try {
    const response = await fetch(new URL(`/api/workspaces/${slug}`, apiBase), {
      headers: { authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (response.status === 403) return { ok: false, status: 403 };
    if (!response.ok) return { ok: false, status: 404 };

    const raw: unknown = await response.json();
    const workspace =
      raw && typeof raw === 'object' && 'workspace' in raw
        ? (raw as { workspace: Workspace }).workspace
        : (raw as Workspace);
    return { ok: true, workspace };
  } catch {
    return { ok: false, status: 404 };
  }
}
