import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

/**
 * Returns whether the community feature is enabled for the current user's school.
 * - Super-admin always gets `true`.
 * - Other roles get the `enable_community` flag from their school's settings.
 */
export function useCommunityEnabled() {
  const { data, isLoading } = useQuery({
    queryKey: ['community-status'],
    queryFn: () => api<{ enabled: boolean }>('/community/status'),
    staleTime: 60_000, // cache for 1 minute
  });

  const enabled = (data?.data as unknown as { enabled: boolean })?.enabled ?? false;

  return { enabled, isLoading };
}
