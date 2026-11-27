import { useQuery } from '@tanstack/react-query';
import { templatesService } from '@/services/templates';

// Shared by /discover-templates and /discover-templates/[id] so both hit the same query-cache
// entry — the detail page finds its template by id from this list instead of issuing a second
// network call, since the public catalog is small.
//
// GET /api/templates/public
// confirmed live in production 26 Sep 2026 (curl-verified: 200, no cookie, real data).
export function usePublicTemplates(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['public-templates'],
    queryFn: templatesService.getPublicTemplates,
    enabled: options.enabled ?? true,
    staleTime: 5 * 60_000, // templates are static — no need to refetch on every page visit
  });
}
