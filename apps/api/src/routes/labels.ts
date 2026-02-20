import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '../env';
import { createLabelSchema } from '@cloudtask/shared';
import { createLabel, getLabelsByProject, deleteLabel } from '../services/label.service';

export const labelRoutes = new Hono<AppEnv>();

// GET /
labelRoutes.get('/', async (c) => {
  const projectId = c.req.query('project_id');
  if (!projectId) return c.json({ error: { message: 'project_id required' } }, 400);
  const labels = await getLabelsByProject(c.env.DB, projectId);
  return c.json({ data: labels });
});

// POST /
labelRoutes.post('/', zValidator('json', createLabelSchema), async (c) => {
  const data = c.req.valid('json');
  const label = await createLabel(c.env.DB, data);
  return c.json({ data: label }, 201);
});

// DELETE /:id
labelRoutes.delete('/:id', async (c) => {
  await deleteLabel(c.env.DB, c.req.param('id'));
  return c.json({ data: { message: 'Label deleted' } });
});
