import { useQuery } from '@tanstack/react-query';
import { getDashboardStatsApi } from '../api/dashboard';

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: getDashboardStatsApi,
  });
}
