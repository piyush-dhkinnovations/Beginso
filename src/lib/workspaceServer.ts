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
// GET /api/workspaces/:id is a Sprint 8 contract-to-confirm endpoint (requirements.md §13) — not
// yet live (confirmed against Beginso-Report/API_CONTRACT.md, which lists only
// POST /api/workspaces and the singular /workspaces/current as live). Whether the backend
// resolves this segment by id or by slug is an open item there (design.md §11.2); this helper
// passes the slug straight through and treats any non-2xx as 403/404 per the documented contract
// error codes, so it needs no change once the real endpoint ships — only real integration
// testing, which cannot happen from this repo.
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
