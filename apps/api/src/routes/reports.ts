import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { getProjectReportStats } from '../services/reports.service';
import { NotFoundError } from '../errors/app-error';

export const reportsRoutes = new Hono<AppEnv>();

// GET /projects/:projectId/reports/stats
reportsRoutes.get('/projects/:projectId/reports/stats', async (c) => {
  const userId = c.get('userId');
  const { projectId } = c.req.param();

  // Verify membership
  const member = await c.env.DB.prepare(
    `SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?`,
  ).bind(projectId, userId).first();
  if (!member) throw new NotFoundError('Project not found');

  const rangeStart = c.req.query('range_start') ? parseInt(c.req.query('range_start')!) : undefined;
  const rangeEnd = c.req.query('range_end') ? parseInt(c.req.query('range_end')!) : undefined;

  const stats = await getProjectReportStats(c.env.DB, projectId, rangeStart, rangeEnd);
  return c.json({ data: stats });
});
