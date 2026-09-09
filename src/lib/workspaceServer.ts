import type { Workspace } from '@/types/workspace';

export type ResolveWorkspaceResult =
  | { ok: true; workspace: Workspace }
  | { ok: false; status: 403 | 404 | 'error' };

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
  // No token here means proxy.ts already let a request through without a valid session
  // (shouldn't happen — /w/:path* is in its protected matcher) — treat it as a real error,
  // not "workspace doesn't exist", so it doesn't get permanently cached as a 404 by a crawler
  // or by Next's route cache.
  if (!apiBase) return { ok: false, status: 'error' };
  if (!token) return { ok: false, status: 'error' };

  try {
    const response = await fetch(new URL(`/api/workspaces/${encodeURIComponent(slug)}`, apiBase), {
      headers: { authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (response.status === 403) return { ok: false, status: 403 };
    if (response.status === 404) return { ok: false, status: 404 };
    // Any other non-2xx (401 from a token that expired between proxy.ts's check and this
    // call, 500, a backend blip) is not proof the workspace doesn't exist — collapsing it
    // into a 404 here previously meant a transient backend failure permanently 404'd a real
    // workspace instead of showing a retryable error.
    if (!response.ok) return { ok: false, status: 'error' };

    const raw: unknown = await response.json();
    const workspace =
      raw && typeof raw === 'object' && 'workspace' in raw
        ? (raw as { workspace: Workspace }).workspace
        : (raw as Workspace);
    return { ok: true, workspace };
  } catch {
    // Network failure / bad JSON — same reasoning: not a confirmed 404.
    return { ok: false, status: 'error' };
  }
}
