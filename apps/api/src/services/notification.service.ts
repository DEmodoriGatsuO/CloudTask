import { generateId, nowUnix } from '@cloudtask/shared';
import type { NotificationWithTask, NotificationType } from '@cloudtask/shared';
import type { PaginationParams } from '@cloudtask/shared';
import { getOffset, createPaginatedResult } from '@cloudtask/shared';

export async function createNotification(
  db: D1Database,
  data: { userId: string; taskId?: string; type: string; title: string; message?: string },
): Promise<void> {
  const id = generateId('ntf');
  await db.prepare(
    `INSERT INTO notifications (id, user_id, task_id, type, title, message, is_read, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
  ).bind(id, data.userId, data.taskId || null, data.type, data.title, data.message || null, nowUnix()).run();
}

export async function getNotificationsByUser(
  db: D1Database,
  userId: string,
  pagination: PaginationParams,
) {
  const countResult = await db.prepare('SELECT COUNT(*) as total FROM notifications WHERE user_id = ?')
    .bind(userId).first<{ total: number }>();
  const total = countResult?.total || 0;

  const offset = getOffset(pagination);
  const results = await db.prepare(
    `SELECT n.*, t.title as task_title, t.project_id
     FROM notifications n
     LEFT JOIN tasks t ON t.id = n.task_id
     WHERE n.user_id = ?
     ORDER BY n.created_at DESC
     LIMIT ? OFFSET ?`,
  ).bind(userId, pagination.pageSize, offset).all();

  const data: NotificationWithTask[] = (results.results || []).map((r) => ({
    id: r.id as string,
    userId: r.user_id as string,
    taskId: r.task_id as string | undefined,
    type: r.type as NotificationType,
    title: r.title as string,
    message: r.message as string | undefined,
    isRead: !!(r.is_read),
    createdAt: r.created_at as number,
    task: r.task_id ? {
      id: r.task_id as string,
      title: r.task_title as string,
      projectId: r.project_id as string,
    } : undefined,
  }));

  return createPaginatedResult(data, total, pagination);
}

export async function markAsRead(db: D1Database, id: string, userId: string): Promise<void> {
  await db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?')
    .bind(id, userId).run();
}

export async function markAllAsRead(db: D1Database, userId: string): Promise<void> {
  await db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0')
    .bind(userId).run();
}

export async function getUnreadCount(db: D1Database, userId: string): Promise<number> {
  const result = await db.prepare('SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = 0')
    .bind(userId).first<{ c: number }>();
  return result?.c || 0;
}

export async function notifyOnMention(
  db: D1Database,
  taskId: string,
  mentionedNames: string[],
  mentionerUserId: string,
  projectId: string,
): Promise<void> {
  // Look up users by display name
  for (const name of mentionedNames) {
    const user = await db.prepare(
      `SELECT u.id FROM users u
       INNER JOIN project_members pm ON pm.user_id = u.id
       WHERE u.display_name LIKE ? AND pm.project_id = ?`,
    ).bind(`%${name}%`, projectId).first<{ id: string }>();

    if (user && user.id !== mentionerUserId) {
      await createNotification(db, {
        userId: user.id,
        taskId,
        type: 'mention',
        title: 'You were mentioned in a comment',
        message: `You were mentioned in a comment on a task`,
      });
    }
  }
}

export async function notifyOnAssignment(
  db: D1Database,
  taskId: string,
  taskTitle: string,
  assigneeId: string,
  assignerId: string,
): Promise<void> {
  if (assigneeId === assignerId) return;
  await createNotification(db, {
    userId: assigneeId,
    taskId,
    type: 'assignment',
    title: 'Task assigned to you',
    message: `You have been assigned to: ${taskTitle}`,
  });
}

export async function notifyOnStatusChange(
  db: D1Database,
  taskId: string,
  taskTitle: string,
  changerId: string,
  projectId: string,
): Promise<void> {
  // Notify assignee and reporter
  const task = await db.prepare('SELECT assignee_id, reporter_id FROM tasks WHERE id = ?')
    .bind(taskId).first();
  if (!task) return;

  const notifyIds = new Set<string>();
  if (task.assignee_id && task.assignee_id !== changerId) notifyIds.add(task.assignee_id as string);
  if (task.reporter_id && task.reporter_id !== changerId) notifyIds.add(task.reporter_id as string);

  for (const userId of notifyIds) {
    await createNotification(db, {
      userId,
      taskId,
      type: 'status_change',
      title: 'Task status changed',
      message: `Status of "${taskTitle}" was updated`,
    });
  }
}
