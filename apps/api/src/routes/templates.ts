import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AppEnv } from '../env';
import {
  createTemplate,
  getTemplateById,
  getAllTemplates,
  deleteTemplate,
  createProjectFromTemplate,
} from '../services/template.service';
import { NotFoundError } from '../errors/app-error';

const templateTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.string().default('todo'),
  priority: z.string().default('medium'),
});

const templateLabelSchema = z.object({
  name: z.string().min(1),
  color: z.string().min(1),
});

const createTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  templateData: z.object({
    projectName: z.string().min(1),
    projectDescription: z.string().optional(),
    tasks: z.array(templateTaskSchema),
    labels: z.array(templateLabelSchema),
  }),
});

export const templateRoutes = new Hono<AppEnv>();

// GET /templates
templateRoutes.get('/templates', async (c) => {
  const templates = await getAllTemplates(c.env.DB);
  return c.json({ data: templates });
});

// POST /templates
templateRoutes.post(
  '/templates',
  zValidator('json', createTemplateSchema),
  async (c) => {
    const data = c.req.valid('json');
    const userId = c.get('userId');
    const template = await createTemplate(c.env.DB, data, userId);
    return c.json({ data: template }, 201);
  },
);

// GET /templates/:id
templateRoutes.get('/templates/:id', async (c) => {
  const template = await getTemplateById(c.env.DB, c.req.param('id'));
  if (!template) throw new NotFoundError('Template not found');
  return c.json({ data: template });
});

// DELETE /templates/:id
templateRoutes.delete('/templates/:id', async (c) => {
  await deleteTemplate(c.env.DB, c.req.param('id'));
  return c.json({ data: { message: 'Template deleted' } });
});

// POST /templates/:id/create-project
templateRoutes.post('/templates/:id/create-project', async (c) => {
  const userId = c.get('userId');
  const projectId = await createProjectFromTemplate(c.env.DB, c.req.param('id'), userId);
  return c.json({ data: { projectId } }, 201);
});
