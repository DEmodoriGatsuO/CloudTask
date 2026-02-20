import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AppEnv } from '../env';
import {
  createRule,
  getRuleById,
  getRulesByProject,
  updateRule,
  deleteRule,
  toggleRule,
} from '../services/automation.service';
import { NotFoundError } from '../errors/app-error';

const createAutomationSchema = z.object({
  name: z.string().min(1).max(200),
  triggerType: z.enum(['status_change', 'due_date_passed', 'task_created', 'assignment_change']),
  triggerConfig: z.record(z.any()),
  actionType: z.enum(['assign_user', 'change_status', 'add_label', 'send_notification']),
  actionConfig: z.record(z.any()),
});

const updateAutomationSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  triggerType: z.enum(['status_change', 'due_date_passed', 'task_created', 'assignment_change']).optional(),
  triggerConfig: z.record(z.any()).optional(),
  actionType: z.enum(['assign_user', 'change_status', 'add_label', 'send_notification']).optional(),
  actionConfig: z.record(z.any()).optional(),
});

const toggleSchema = z.object({
  isActive: z.boolean(),
});

export const automationRoutes = new Hono<AppEnv>();

// GET /projects/:projectId/automations
automationRoutes.get('/projects/:projectId/automations', async (c) => {
  const projectId = c.req.param('projectId');
  const rules = await getRulesByProject(c.env.DB, projectId);
  return c.json({ data: rules });
});

// POST /projects/:projectId/automations
automationRoutes.post(
  '/projects/:projectId/automations',
  zValidator('json', createAutomationSchema),
  async (c) => {
    const projectId = c.req.param('projectId');
    const data = c.req.valid('json');
    const rule = await createRule(c.env.DB, projectId, data);
    return c.json({ data: rule }, 201);
  },
);

// GET /automations/:id
automationRoutes.get('/automations/:id', async (c) => {
  const rule = await getRuleById(c.env.DB, c.req.param('id'));
  if (!rule) throw new NotFoundError('Automation rule not found');
  return c.json({ data: rule });
});

// PATCH /automations/:id
automationRoutes.patch(
  '/automations/:id',
  zValidator('json', updateAutomationSchema),
  async (c) => {
    const data = c.req.valid('json');
    const rule = await updateRule(c.env.DB, c.req.param('id'), data);
    return c.json({ data: rule });
  },
);

// DELETE /automations/:id
automationRoutes.delete('/automations/:id', async (c) => {
  await deleteRule(c.env.DB, c.req.param('id'));
  return c.json({ data: { message: 'Automation rule deleted' } });
});

// POST /automations/:id/toggle
automationRoutes.post(
  '/automations/:id/toggle',
  zValidator('json', toggleSchema),
  async (c) => {
    const { isActive } = c.req.valid('json');
    await toggleRule(c.env.DB, c.req.param('id'), isActive);
    return c.json({ data: { message: `Automation rule ${isActive ? 'activated' : 'deactivated'}` } });
  },
);
