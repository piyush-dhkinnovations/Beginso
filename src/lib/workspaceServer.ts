import type { Role, Workspace } from '@/types/workspace';

// role/isOwner are optional because they are read defensively from the reply. Every consumer
// (WorkspaceSidebar's role-gated nav) must treat "role unknown" as "hide the gated item" — fail
// closed, not fail open, since the real authorization boundary is server-side anyway and an
// unknown role here proves nothing about what the caller can actually do.
export type ResolveWorkspaceResult =
  | { ok: true; workspace: Workspace; role?: Role; isOwner?: boolean }
  | { ok: false; status: 403 | 404 | 'error' };

// Server-only. Mirrors proxy.ts's own hasValidSession() — the only existing precedent in this
// codebase for an authenticated server-side call. Every service under src/services/ is
// client-side only (axiosInstance's baseURL is the browser-relative '/api/backend'), so there
// was no established pattern to reuse for a Server Component's own fetch; this is the smallest
// extension of the one that does exist rather than a new one.
//
// GET /api/workspaces/:id explicitly accepts either an ObjectId or a lowercase slug in the :id
// segment (Beginso-Report/API_CONTRACT.md), so passing the slug straight through is correct. Error
// shape: 403 FORBIDDEN_WORKSPACE_ACCESS on a foreign workspace, 404 on a nonexistent one, which
// is what the handling below expects.
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
    const body =
      raw && typeof raw === 'object' && 'workspace' in raw
        ? (raw as { workspace: Workspace & { role?: Role; isOwner?: boolean } }).workspace
        : (raw as Workspace & { role?: Role; isOwner?: boolean });
    // role/isOwner are read defensively off the same object (added directly onto the workspace detail
    // response, matching WorkspaceListItem's own shape); see the ResolveWorkspaceResult comment above.
    const { role, isOwner, ...workspace } = body;
    return { ok: true, workspace, role, isOwner };
  } catch {
    // Network failure / bad JSON — same reasoning: not a confirmed 404.
    return { ok: false, status: 'error' };
  }
}
