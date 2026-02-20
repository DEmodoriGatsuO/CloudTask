import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { getNotificationsByUser, markAsRead, markAllAsRead, getUnreadCount } from '../services/notification.service';

export const notificationRoutes = new Hono<AppEnv>();

// GET /
notificationRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  const page = parseInt(c.req.query('page') || '1');
  const pageSize = parseInt(c.req.query('pageSize') || '20');
  const result = await getNotificationsByUser(c.env.DB, userId, { page, pageSize });
  return c.json(result);
});

// GET /unread-count
notificationRoutes.get('/unread-count', async (c) => {
  const count = await getUnreadCount(c.env.DB, c.get('userId'));
  return c.json({ data: { count } });
});

// PATCH /:id/read
notificationRoutes.patch('/:id/read', async (c) => {
  await markAsRead(c.env.DB, c.req.param('id'), c.get('userId'));
  return c.json({ data: { message: 'Marked as read' } });
});

// POST /mark-all-read
notificationRoutes.post('/mark-all-read', async (c) => {
  await markAllAsRead(c.env.DB, c.get('userId'));
  return c.json({ data: { message: 'All marked as read' } });
});
