import { toCamelCase } from '../db/queries';
import { nowUnix } from '@cloudtask/shared';

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

export async function getDashboardStats(
  db: D1Database,
  userId: string,
): Promise<DashboardStats> {
  const now = nowUnix();
  const sevenDaysLater = now + 7 * 24 * 60 * 60 * 1000;

  // Run queries in parallel using D1 batch
  const [
    projectCountResult,
    totalTaskCountResult,
    completedTaskCountResult,
    overdueResult,
    upcomingResult,
    myTodoResult,
    myInProgressResult,
    myDoneResult,
  ] = await db.batch([
    // Project count for user
    db.prepare(
      `SELECT COUNT(DISTINCT p.id) as count FROM projects p
       INNER JOIN project_members pm ON pm.project_id = p.id
       WHERE pm.user_id = ?`,
    ).bind(userId),
    // Total task count across user's projects
    db.prepare(
      `SELECT COUNT(*) as count FROM tasks t
       INNER JOIN project_members pm ON pm.project_id = t.project_id
       WHERE pm.user_id = ?`,
    ).bind(userId),
    // Completed task count
    db.prepare(
      `SELECT COUNT(*) as count FROM tasks t
       INNER JOIN project_members pm ON pm.project_id = t.project_id
       WHERE pm.user_id = ? AND t.status IN ('done', 'completed')`,
    ).bind(userId),
    // Overdue tasks
    db.prepare(
      `SELECT t.id, t.title, t.status, t.priority, t.due_date, t.project_id,
              p.name as project_name, u.id as assignee_id, u.display_name as assignee_name
       FROM tasks t
       INNER JOIN projects p ON p.id = t.project_id
       INNER JOIN project_members pm ON pm.project_id = t.project_id
       LEFT JOIN users u ON u.id = t.assignee_id
       WHERE pm.user_id = ? AND t.due_date IS NOT NULL AND t.due_date < ? AND t.status NOT IN ('done', 'completed')
       ORDER BY t.due_date ASC
       LIMIT 20`,
    ).bind(userId, now),
    // Upcoming tasks (next 7 days)
    db.prepare(
      `SELECT t.id, t.title, t.status, t.priority, t.due_date, t.project_id,
              p.name as project_name, u.id as assignee_id, u.display_name as assignee_name
       FROM tasks t
       INNER JOIN projects p ON p.id = t.project_id
       INNER JOIN project_members pm ON pm.project_id = t.project_id
       LEFT JOIN users u ON u.id = t.assignee_id
       WHERE pm.user_id = ? AND t.due_date IS NOT NULL AND t.due_date >= ? AND t.due_date <= ? AND t.status NOT IN ('done', 'completed')
       ORDER BY t.due_date ASC
       LIMIT 20`,
    ).bind(userId, now, sevenDaysLater),
    // My tasks - todo
    db.prepare(
      `SELECT t.id, t.title, t.status, t.priority, t.due_date, t.project_id,
              p.name as project_name
       FROM tasks t
       INNER JOIN projects p ON p.id = t.project_id
       WHERE t.assignee_id = ? AND t.status = 'todo'
       ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC
       LIMIT 10`,
    ).bind(userId),
    // My tasks - in_progress
    db.prepare(
      `SELECT t.id, t.title, t.status, t.priority, t.due_date, t.project_id,
              p.name as project_name
       FROM tasks t
       INNER JOIN projects p ON p.id = t.project_id
       WHERE t.assignee_id = ? AND t.status = 'in_progress'
       ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC
       LIMIT 10`,
    ).bind(userId),
    // My tasks - done
    db.prepare(
      `SELECT t.id, t.title, t.status, t.priority, t.due_date, t.project_id,
              p.name as project_name
       FROM tasks t
       INNER JOIN projects p ON p.id = t.project_id
       WHERE t.assignee_id = ? AND t.status = 'done'
       ORDER BY t.updated_at DESC
       LIMIT 10`,
    ).bind(userId),
  ]);

  const mapTask = (row: Record<string, unknown>): DashboardTask => ({
    id: row.id as string,
    title: row.title as string,
    status: row.status as string,
    priority: row.priority as string,
    dueDate: row.due_date as number | null,
    projectId: row.project_id as string,
    projectName: row.project_name as string,
    assignee: row.assignee_id
      ? { id: row.assignee_id as string, displayName: row.assignee_name as string }
      : undefined,
  });

  return {
    projectCount: (projectCountResult.results[0] as { count: number } | undefined)?.count ?? 0,
    totalTaskCount: (totalTaskCountResult.results[0] as { count: number } | undefined)?.count ?? 0,
    completedTaskCount: (completedTaskCountResult.results[0] as { count: number } | undefined)?.count ?? 0,
    overdueTaskCount: overdueResult.results.length,
    overdueTasks: (overdueResult.results as Record<string, unknown>[]).map(mapTask),
    upcomingTasks: (upcomingResult.results as Record<string, unknown>[]).map(mapTask),
    myTasks: {
      todo: (myTodoResult.results as Record<string, unknown>[]).map(mapTask),
      inProgress: (myInProgressResult.results as Record<string, unknown>[]).map(mapTask),
      done: (myDoneResult.results as Record<string, unknown>[]).map(mapTask),
    },
  };
}
