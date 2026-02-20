import { api } from './client';

export interface DashboardTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: number | null;
  projectId: string;
  projectName: string;
  assignee?: { id: string; displayName: string };
}

export interface DashboardStats {
  projectCount: number;
  totalTaskCount: number;
  completedTaskCount: number;
  overdueTaskCount: number;
  overdueTasks: DashboardTask[];
  upcomingTasks: DashboardTask[];
  myTasks: {
    todo: DashboardTask[];
    inProgress: DashboardTask[];
    done: DashboardTask[];
  };
}

export function getDashboardStatsApi() {
  return api.get<{ data: DashboardStats }>('/dashboard/stats');
}
