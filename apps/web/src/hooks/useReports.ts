import { useQuery } from '@tanstack/react-query';
import { getProjectReportStatsApi } from '../api/reports';

export function useProjectReportStats(
  projectId: string,
  rangeStart?: number,
  rangeEnd?: number,
) {
  return useQuery({
    queryKey: ['reports', projectId, rangeStart, rangeEnd],
    queryFn: () => getProjectReportStatsApi(projectId, rangeStart, rangeEnd),
    enabled: !!projectId,
  });
}
