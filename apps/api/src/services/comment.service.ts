import { generateId, nowUnix } from '@cloudtask/shared';
import type { CommentWithUser } from '@cloudtask/shared';
import { NotFoundError } from '../errors/app-error';
import type { PaginationParams } from '@cloudtask/shared';
import { getOffset, createPaginatedResult } from '@cloudtask/shared';

export async function createComment(
  db: D1Database,
  taskId: string,
  userId: string,
  content: string,
): Promise<CommentWithUser> {
  const id = generateId('cmt');
  const now = nowUnix();

  await db.prepare(
    `INSERT INTO comments (id, task_id, user_id, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
  ).bind(id, taskId, userId, content, now, now).run();

  const user = await db.prepare('SELECT id, display_name, avatar_url FROM users WHERE id = ?')
    .bind(userId).first();

  return {
    id, taskId, userId, content, createdAt: now, updatedAt: now,
    user: {
      id: userId,
      displayName: (user?.display_name as string) || 'Unknown',
      avatarUrl: user?.avatar_url as string | undefined,
    },
  };
}

export async function getCommentsByTask(
  db: D1Database,
  taskId: string,
  pagination: PaginationParams,
) {
  const countResult = await db.prepare('SELECT COUNT(*) as total FROM comments WHERE task_id = ?')
    .bind(taskId).first<{ total: number }>();
  const total = countResult?.total || 0;

  const offset = getOffset(pagination);
  const results = await db.prepare(
    `SELECT c.*, u.display_name, u.avatar_url
     FROM comments c INNER JOIN users u ON u.id = c.user_id
     WHERE c.task_id = ? ORDER BY c.created_at ASC LIMIT ? OFFSET ?`,
  ).bind(taskId, pagination.pageSize, offset).all();

  const data: CommentWithUser[] = (results.results || []).map((r) => ({
    id: r.id as string,
    taskId: r.task_id as string,
    userId: r.user_id as string,
    content: r.content as string,
    createdAt: r.created_at as number,
    updatedAt: r.updated_at as number,
    user: {
      id: r.user_id as string,
      displayName: r.display_name as string,
      avatarUrl: r.avatar_url as string | undefined,
    },
  }));

  return createPaginatedResult(data, total, pagination);
}

export async function updateComment(db: D1Database, id: string, content: string, userId: string) {
  const existing = await db.prepare('SELECT user_id FROM comments WHERE id = ?').bind(id).first();
  if (!existing) throw new NotFoundError('Comment not found');
  if (existing.user_id !== userId) throw new NotFoundError('Not authorized');

  const now = nowUnix();
  await db.prepare('UPDATE comments SET content = ?, updated_at = ? WHERE id = ?')
    .bind(content, now, id).run();
}

export async function deleteComment(db: D1Database, id: string, userId: string) {
  const existing = await db.prepare('SELECT user_id FROM comments WHERE id = ?').bind(id).first();
  if (!existing) throw new NotFoundError('Comment not found');
  // Allow own comments or will check admin elsewhere
  await db.prepare('DELETE FROM comments WHERE id = ?').bind(id).run();
}

export function extractMentions(content: string): string[] {
  const regex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    mentions.push(match[1]);
  }
  return [...new Set(mentions)];
}
