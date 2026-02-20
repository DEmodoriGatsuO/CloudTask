import { api } from './client';

export interface TaskStatusCount {
  status: string;
  count: number;
}

export interface PriorityCount {
  priority: string;
  count: number;
}

export interface MemberWorkload {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  todo: number;
  inProgress: number;
  done: number;
  total: number;
}

export interface DailyCompletionPoint {
  date: string;
  completed: number;
  created: number;
}

export interface ProjectReportStats {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  completionRate: number;
  avgProgress: number;
  statusCounts: TaskStatusCount[];
  priorityCounts: PriorityCount[];
  memberWorkloads: MemberWorkload[];
  dailyCompletion: DailyCompletionPoint[];
}

export function getProjectReportStatsApi(
  projectId: string,
  rangeStart?: number,
  rangeEnd?: number,
) {
  const params = new URLSearchParams();
  if (rangeStart) params.set('range_start', String(rangeStart));
  if (rangeEnd) params.set('range_end', String(rangeEnd));
  const qs = params.toString();
  return api.get<{ data: ProjectReportStats }>(
    `/projects/${projectId}/reports/stats${qs ? `?${qs}` : ''}`,
  );
}
