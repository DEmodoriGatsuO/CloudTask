import { Hono } from 'hono';
import type { AppEnv } from '../env';
import {
  createAttachment,
  getAttachmentById,
  getAttachmentsByTask,
  deleteAttachment,
  uploadToR2,
  deleteFromR2,
  getFromR2,
} from '../services/attachment.service';
import { logActivity } from '../services/activity.service';
import { AppError, NotFoundError, ValidationError } from '../errors/app-error';
import { generateId } from '@cloudtask/shared';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function requireR2(files: R2Bucket | undefined): R2Bucket {
  if (!files) throw new AppError(503, 'File storage is not configured', 'R2_NOT_CONFIGURED');
  return files;
}

export const attachmentRoutes = new Hono<AppEnv>();

// POST /tasks/:taskId/attachments - upload an attachment to a task
attachmentRoutes.post('/tasks/:taskId/attachments', async (c) => {
  const taskId = c.req.param('taskId');
  const userId = c.get('userId');

  // Verify task exists and get project_id
  const task = await c.env.DB.prepare('SELECT id, project_id FROM tasks WHERE id = ?')
    .bind(taskId).first();
  if (!task) throw new NotFoundError('Task not found');

  const body = await c.req.parseBody();
  const file = body['file'];

  if (!file || !(file instanceof File)) {
    throw new ValidationError('File is required. Send as multipart form with field name "file".');
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new ValidationError(`File size exceeds the limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
  }

  const fileId = generateId('file');
  const r2Key = `attachments/${task.project_id}/tasks/${taskId}/${fileId}_${file.name}`;

  // Upload to R2
  const arrayBuffer = await file.arrayBuffer();
  await uploadToR2(requireR2(c.env.FILES), r2Key, arrayBuffer, file.type || 'application/octet-stream');

  // Save metadata in DB
  const attachment = await createAttachment(c.env.DB, {
    taskId,
    userId,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type || 'application/octet-stream',
    r2Key,
  });

  await logActivity(c.env.DB, {
    projectId: task.project_id as string,
    taskId,
    userId,
    action: 'attachment_added',
    details: JSON.stringify({ fileName: file.name }),
  });

  return c.json({ data: attachment }, 201);
});

// GET /tasks/:taskId/attachments - list attachments for a task
attachmentRoutes.get('/tasks/:taskId/attachments', async (c) => {
  const taskId = c.req.param('taskId');
  const attachments = await getAttachmentsByTask(c.env.DB, taskId);
  return c.json({ data: attachments });
});

// GET /attachments/:id - get attachment info
attachmentRoutes.get('/attachments/:id', async (c) => {
  const attachment = await getAttachmentById(c.env.DB, c.req.param('id'));
  if (!attachment) throw new NotFoundError('Attachment not found');
  return c.json({ data: attachment });
});

// GET /attachments/:id/download - download/stream attachment from R2
attachmentRoutes.get('/attachments/:id/download', async (c) => {
  const attachment = await getAttachmentById(c.env.DB, c.req.param('id'));
  if (!attachment) throw new NotFoundError('Attachment not found');

  const object = await getFromR2(requireR2(c.env.FILES), attachment.r2Key);
  if (!object) throw new NotFoundError('File not found in storage');

  const headers = new Headers();
  headers.set('Content-Type', attachment.mimeType);
  // ?inline=1 が付いている場合はブラウザ内表示（画像/PDFプレビュー用）
  const isInline = c.req.query('inline') === '1';
  const disposition = isInline
    ? `inline; filename="${encodeURIComponent(attachment.fileName)}"`
    : `attachment; filename="${encodeURIComponent(attachment.fileName)}"`;
  headers.set('Content-Disposition', disposition);
  headers.set('Content-Length', String(attachment.fileSize));

  // Write etag and cache headers if available
  if (object.etag) {
    headers.set('ETag', object.etag);
  }
  headers.set('Cache-Control', 'private, max-age=3600');

  return new Response(object.body, { headers });
});

// DELETE /attachments/:id - delete attachment (also delete from R2)
attachmentRoutes.delete('/attachments/:id', async (c) => {
  const id = c.req.param('id');
  const userId = c.get('userId');

  const attachment = await deleteAttachment(c.env.DB, id);
  if (!attachment) throw new NotFoundError('Attachment not found');

  // Delete file from R2
  await deleteFromR2(requireR2(c.env.FILES), attachment.r2Key);

  // Log activity if task-linked
  if (attachment.taskId) {
    const task = await c.env.DB.prepare('SELECT project_id FROM tasks WHERE id = ?')
      .bind(attachment.taskId).first();
    if (task) {
      await logActivity(c.env.DB, {
        projectId: task.project_id as string,
        taskId: attachment.taskId,
        userId,
        action: 'attachment_removed',
        details: JSON.stringify({ fileName: attachment.fileName }),
      });
    }
  }

  return c.json({ data: { message: 'Attachment deleted' } });
});
