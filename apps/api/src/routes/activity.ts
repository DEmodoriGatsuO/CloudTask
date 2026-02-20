import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { getActivitiesByProject } from '../services/activity.service';

export const activityRoutes = new Hono<AppEnv>();

// GET /
activityRoutes.get('/', async (c) => {
  const projectId = c.req.query('project_id');
  if (!projectId) return c.json({ error: { message: 'project_id required' } }, 400);

  const page = parseInt(c.req.query('page') || '1');
  const pageSize = parseInt(c.req.query('pageSize') || '20');
  const result = await getActivitiesByProject(c.env.DB, projectId, { page, pageSize });
  return c.json(result);
});
