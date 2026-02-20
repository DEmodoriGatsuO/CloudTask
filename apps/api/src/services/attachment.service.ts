import { generateId, nowUnix } from '@cloudtask/shared';
import type { Attachment, AttachmentWithUser } from '@cloudtask/shared';
import { toCamelCase } from '../db/queries';
import { NotFoundError } from '../errors/app-error';

export async function createAttachment(
  db: D1Database,
  data: {
    taskId?: string;
    commentId?: string;
    userId: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    r2Key: string;
  },
): Promise<Attachment> {
  const id = generateId('att');
  const now = nowUnix();

  await db.prepare(
    `INSERT INTO attachments (id, task_id, comment_id, user_id, file_name, file_size, mime_type, r2_key, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    id,
    data.taskId || null,
    data.commentId || null,
    data.userId,
    data.fileName,
    data.fileSize,
    data.mimeType,
    data.r2Key,
    now,
  ).run();

  const row = await db.prepare('SELECT * FROM attachments WHERE id = ?').bind(id).first();
  return toCamelCase<Attachment>(row!);
}

export async function getAttachmentById(
  db: D1Database,
  id: string,
): Promise<AttachmentWithUser | null> {
  const row = await db.prepare(
    `SELECT a.*, u.display_name
     FROM attachments a
     INNER JOIN users u ON u.id = a.user_id
     WHERE a.id = ?`,
  ).bind(id).first();

  if (!row) return null;

  const attachment = toCamelCase<Attachment>(row);
  return {
    ...attachment,
    user: {
      id: row.user_id as string,
      displayName: row.display_name as string,
    },
  };
}

export async function getAttachmentsByTask(
  db: D1Database,
  taskId: string,
): Promise<AttachmentWithUser[]> {
  const results = await db.prepare(
    `SELECT a.*, u.display_name
     FROM attachments a
     INNER JOIN users u ON u.id = a.user_id
     WHERE a.task_id = ?
     ORDER BY a.created_at DESC`,
  ).bind(taskId).all();

  return (results.results || []).map((row) => {
    const attachment = toCamelCase<Attachment>(row);
    return {
      ...attachment,
      user: {
        id: row.user_id as string,
        displayName: row.display_name as string,
      },
    };
  });
}

export async function deleteAttachment(
  db: D1Database,
  id: string,
): Promise<Attachment | null> {
  const row = await db.prepare('SELECT * FROM attachments WHERE id = ?').bind(id).first();
  if (!row) return null;

  await db.prepare('DELETE FROM attachments WHERE id = ?').bind(id).run();

  return toCamelCase<Attachment>(row);
}

// --- R2 operations ---

export async function uploadToR2(
  r2: R2Bucket,
  key: string,
  data: ArrayBuffer,
  mimeType: string,
): Promise<void> {
  await r2.put(key, data, {
    httpMetadata: {
      contentType: mimeType,
    },
  });
}

export async function deleteFromR2(
  r2: R2Bucket,
  key: string,
): Promise<void> {
  await r2.delete(key);
}

export async function getFromR2(
  r2: R2Bucket,
  key: string,
): Promise<R2ObjectBody | null> {
  return await r2.get(key);
}
