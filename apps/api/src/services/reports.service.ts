import { toCamelCase } from '../db/queries';
import { nowUnix } from '@cloudtask/shared';

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
  date: string; // 'YYYY-MM-DD'
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

export async function getProjectReportStats(
  db: D1Database,
  projectId: string,
  rangeStart?: number,
  rangeEnd?: number,
): Promise<ProjectReportStats> {
  const now = nowUnix();
  const start = rangeStart ?? now - 30 * 24 * 60 * 60;
  const end = rangeEnd ?? now;

  const [
    statusResult,
    priorityResult,
    overdueResult,
    avgProgressResult,
    memberResult,
    createdResult,
    completedResult,
  ] = await db.batch([
    // Status distribution
    db.prepare(
      `SELECT status, COUNT(*) as count FROM tasks WHERE project_id = ? GROUP BY status`,
    ).bind(projectId),
    // Priority distribution
    db.prepare(
      `SELECT priority, COUNT(*) as count FROM tasks WHERE project_id = ? GROUP BY priority`,
    ).bind(projectId),
    // Overdue count
    db.prepare(
      `SELECT COUNT(*) as count FROM tasks WHERE project_id = ? AND due_date IS NOT NULL AND due_date < ? AND status NOT IN ('done','completed')`,
    ).bind(projectId, now),
    // Average progress
    db.prepare(
      `SELECT AVG(progress) as avg FROM tasks WHERE project_id = ?`,
    ).bind(projectId),
    // Member workload
    db.prepare(
      `SELECT u.id as user_id, u.display_name, u.avatar_url,
              SUM(CASE WHEN t.status = 'todo' THEN 1 ELSE 0 END) as todo,
              SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
              SUM(CASE WHEN t.status IN ('done','completed') THEN 1 ELSE 0 END) as done,
              COUNT(*) as total
       FROM tasks t
       INNER JOIN users u ON u.id = t.assignee_id
       WHERE t.project_id = ?
       GROUP BY u.id, u.display_name, u.avatar_url
       ORDER BY total DESC`,
    ).bind(projectId),
    // Created per day (range)
    db.prepare(
      `SELECT date(created_at, 'unixepoch') as day, COUNT(*) as count
       FROM tasks WHERE project_id = ? AND created_at >= ? AND created_at <= ?
       GROUP BY day ORDER BY day`,
    ).bind(projectId, start, end),
    // Completed per day (range) — use updated_at as proxy for completion date
    db.prepare(
      `SELECT date(updated_at, 'unixepoch') as day, COUNT(*) as count
       FROM tasks WHERE project_id = ? AND status IN ('done','completed') AND updated_at >= ? AND updated_at <= ?
       GROUP BY day ORDER BY day`,
    ).bind(projectId, start, end),
  ]);

  type StatusRow = { status: string; count: number };
  type PriorityRow = { priority: string; count: number };
  type MemberRow = { user_id: string; display_name: string; avatar_url: string | null; todo: number; in_progress: number; done: number; total: number };
  type DayRow = { day: string; count: number };
  type AvgRow = { avg: number | null };
  type CountRow = { count: number };

  const statusCounts = (statusResult.results as StatusRow[]).map((r) => ({
    status: r.status,
    count: r.count,
  }));

  const priorityCounts = (priorityResult.results as PriorityRow[]).map((r) => ({
    priority: r.priority,
    count: r.count,
  }));

  const totalTasks = statusCounts.reduce((s, r) => s + r.count, 0);
  const completedTasks = statusCounts
    .filter((r) => r.status === 'done' || r.status === 'completed')
    .reduce((s, r) => s + r.count, 0);
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const avgProgress = Math.round((avgProgressResult.results[0] as AvgRow | undefined)?.avg ?? 0);
  const overdueTasks = (overdueResult.results[0] as CountRow | undefined)?.count ?? 0;

  const memberWorkloads: MemberWorkload[] = (memberResult.results as MemberRow[]).map((r) => ({
    userId: r.user_id,
    displayName: r.display_name,
    avatarUrl: r.avatar_url,
    todo: r.todo,
    inProgress: r.in_progress,
    done: r.done,
    total: r.total,
  }));

  // Merge created/completed into a unified daily series
  const dayMap = new Map<string, { completed: number; created: number }>();
  // Fill range with zeros
  const startDate = new Date(start * 1000);
  const endDate = new Date(end * 1000);
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    dayMap.set(key, { completed: 0, created: 0 });
  }
  for (const r of createdResult.results as DayRow[]) {
    const entry = dayMap.get(r.day);
    if (entry) entry.created = r.count;
  }
  for (const r of completedResult.results as DayRow[]) {
    const entry = dayMap.get(r.day);
    if (entry) entry.completed = r.count;
  }

  const dailyCompletion: DailyCompletionPoint[] = Array.from(dayMap.entries())
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalTasks,
    completedTasks,
    overdueTasks,
    completionRate,
    avgProgress,
    statusCounts,
    priorityCounts,
    memberWorkloads,
    dailyCompletion,
  };
}
