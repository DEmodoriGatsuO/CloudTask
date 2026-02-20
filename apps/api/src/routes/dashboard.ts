import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { getDashboardStats } from '../services/dashboard.service';

export const dashboardRoutes = new Hono<AppEnv>();

dashboardRoutes.get('/stats', async (c) => {
  const userId = c.get('userId');
  const stats = await getDashboardStats(c.env.DB, userId);
  return c.json({ data: stats });
});
