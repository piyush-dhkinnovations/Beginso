import { useQuery } from '@tanstack/react-query';
import { templatesService } from '@/services/templates';

// Shared by /discover-templates and /discover-templates/[id] so both hit the same query-cache
// entry — the detail page finds its template by id from this list instead of issuing a second
// network call, since the public catalog is small (see design.md "Fetching").
//
// Phase 2 (.kiro/specs/public-template-gallery/tasks.md, task 7): GET /api/templates/public
// confirmed live in production 26 Sep 2026 (curl-verified: 200, no cookie, real data) — this now
// calls it directly. The Phase 1 mock/fixture has been removed.
export function usePublicTemplates() {
  return useQuery({
    queryKey: ['public-templates'],
    queryFn: templatesService.getPublicTemplates,
  });
}
