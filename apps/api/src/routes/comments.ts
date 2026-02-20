import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '../env';
import { createCommentSchema, updateCommentSchema } from '@cloudtask/shared';
import { createComment, getCommentsByTask, updateComment, deleteComment, extractMentions } from '../services/comment.service';
import { logActivity } from '../services/activity.service';
import { notifyOnMention } from '../services/notification.service';
import { NotFoundError } from '../errors/app-error';

export const commentRoutes = new Hono<AppEnv>();

// GET /tasks/:taskId/comments
commentRoutes.get('/tasks/:taskId/comments', async (c) => {
  const taskId = c.req.param('taskId');
  const page = parseInt(c.req.query('page') || '1');
  const pageSize = parseInt(c.req.query('pageSize') || '50');
  const result = await getCommentsByTask(c.env.DB, taskId, { page, pageSize });
  return c.json(result);
});

// POST /tasks/:taskId/comments
commentRoutes.post('/tasks/:taskId/comments', zValidator('json', createCommentSchema), async (c) => {
  const taskId = c.req.param('taskId');
  const { content } = c.req.valid('json');
  const userId = c.get('userId');

  const comment = await createComment(c.env.DB, taskId, userId, content);

  // Get task for project_id
  const task = await c.env.DB.prepare('SELECT project_id, title FROM tasks WHERE id = ?').bind(taskId).first();
  if (task) {
    await logActivity(c.env.DB, { projectId: task.project_id as string, taskId, userId, action: 'commented' });

    // Handle mentions
    const mentions = extractMentions(content);
    if (mentions.length > 0) {
      await notifyOnMention(c.env.DB, taskId, mentions, userId, task.project_id as string);
    }
  }

  return c.json({ data: comment }, 201);
});

// PATCH /:id
commentRoutes.patch('/:id', zValidator('json', updateCommentSchema), async (c) => {
  const { content } = c.req.valid('json');
  await updateComment(c.env.DB, c.req.param('id'), content, c.get('userId'));
  return c.json({ data: { message: 'Comment updated' } });
});

// DELETE /:id
commentRoutes.delete('/:id', async (c) => {
  await deleteComment(c.env.DB, c.req.param('id'), c.get('userId'));
  return c.json({ data: { message: 'Comment deleted' } });
});
