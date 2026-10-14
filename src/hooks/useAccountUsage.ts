import { useQuery } from '@tanstack/react-query';
import { settingsService } from '@/services/settings';
import { settingsKeys } from '@/lib/queryKeys';

/** Storage and workspace allowance from GET /api/users/me; shares its cache with the Settings profile query. */
export function useAccountUsage() {
  const { data } = useQuery({
    queryKey: settingsKeys.profile(),
    queryFn: settingsService.getProfile,
    // Refreshed by lib/storageRefresh.ts after any write that can change storage. The poll and the focus refetch
    // cover changes made elsewhere (a public submission with a file, another tab, another device).
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  return data;
}
