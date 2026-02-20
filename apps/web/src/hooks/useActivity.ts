import { useQuery } from '@tanstack/react-query';
import { getActivityApi } from '../api/activity';

export function useActivity(projectId: string, page = 1) {
  return useQuery({
    queryKey: ['activity', projectId, page],
    queryFn: () => getActivityApi(projectId, page),
    enabled: !!projectId,
  });
}
