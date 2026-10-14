import { useQuery } from '@tanstack/react-query';
import { settingsService } from '@/services/settings';
import { settingsKeys } from '@/lib/queryKeys';

/** Storage and workspace allowance from GET /api/users/me; shares its cache with the Settings profile query. */
export function useAccountUsage() {
  const { data } = useQuery({
    queryKey: settingsKeys.profile(),
    queryFn: settingsService.getProfile,
    staleTime: 60_000,
  });
  return data;
}
