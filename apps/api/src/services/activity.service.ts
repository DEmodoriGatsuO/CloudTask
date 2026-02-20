import { generateId, nowUnix } from '@cloudtask/shared';
import type { ActivityLogWithUser, ActivityAction } from '@cloudtask/shared';
import type { PaginationParams } from '@cloudtask/shared';
import { getOffset, createPaginatedResult } from '@cloudtask/shared';

export async function logActivity(
  db: D1Database,
  data: {
    projectId: string;
    taskId?: string;
    userId: string;
    action: string;
    details?: string;
  },
): Promise<void> {
  const id = generateId('act');
  await db.prepare(
    `INSERT INTO activity_logs (id, project_id, task_id, user_id, action, details, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).bind(id, data.projectId, data.taskId || null, data.userId, data.action, data.details || null, nowUnix()).run();
}

export async function getActivitiesByProject(
  db: D1Database,
  projectId: string,
  pagination: PaginationParams,
) {
  const countResult = await db.prepare('SELECT COUNT(*) as total FROM activity_logs WHERE project_id = ?')
    .bind(projectId).first<{ total: number }>();
  const total = countResult?.total || 0;

  const offset = getOffset(pagination);
  const results = await db.prepare(
    `SELECT a.*, u.display_name, u.avatar_url, t.title as task_title
     FROM activity_logs a
     INNER JOIN users u ON u.id = a.user_id
     LEFT JOIN tasks t ON t.id = a.task_id
     WHERE a.project_id = ?
     ORDER BY a.created_at DESC
     LIMIT ? OFFSET ?`,
  ).bind(projectId, pagination.pageSize, offset).all();

  const data: ActivityLogWithUser[] = (results.results || []).map((r) => ({
    id: r.id as string,
    projectId: r.project_id as string,
    taskId: r.task_id as string | undefined,
    userId: r.user_id as string,
    action: r.action as ActivityAction,
    details: r.details as string | undefined,
    createdAt: r.created_at as number,
    user: {
      id: r.user_id as string,
      displayName: r.display_name as string,
      avatarUrl: r.avatar_url as string | undefined,
    },
    task: r.task_id ? { id: r.task_id as string, title: r.task_title as string } : undefined,
  }));

  return createPaginatedResult(data, total, pagination);
}
