import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AppEnv } from '../env';
import {
  createWorkflow,
  getWorkflowById,
  getWorkflowsByProject,
  updateWorkflow,
  deleteWorkflow,
  validateTransition,
} from '../services/workflow.service';
import { NotFoundError } from '../errors/app-error';

const workflowStatusSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  color: z.string().min(1),
});

const workflowTransitionSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
});

const createWorkflowSchema = z.object({
  name: z.string().min(1).max(200),
  statuses: z.array(workflowStatusSchema).min(1),
  transitions: z.array(workflowTransitionSchema),
});

const updateWorkflowSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  statuses: z.array(workflowStatusSchema).min(1).optional(),
  transitions: z.array(workflowTransitionSchema).optional(),
});

const validateTransitionSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
});

export const workflowRoutes = new Hono<AppEnv>();

// GET /projects/:projectId/workflows
workflowRoutes.get('/projects/:projectId/workflows', async (c) => {
  const projectId = c.req.param('projectId');
  const workflows = await getWorkflowsByProject(c.env.DB, projectId);
  return c.json({ data: workflows });
});

// POST /projects/:projectId/workflows
workflowRoutes.post(
  '/projects/:projectId/workflows',
  zValidator('json', createWorkflowSchema),
  async (c) => {
    const projectId = c.req.param('projectId');
    const data = c.req.valid('json');
    const workflow = await createWorkflow(c.env.DB, projectId, data);
    return c.json({ data: workflow }, 201);
  },
);

// GET /workflows/:id
workflowRoutes.get('/workflows/:id', async (c) => {
  const workflow = await getWorkflowById(c.env.DB, c.req.param('id'));
  if (!workflow) throw new NotFoundError('Workflow not found');
  return c.json({ data: workflow });
});

// PATCH /workflows/:id
workflowRoutes.patch(
  '/workflows/:id',
  zValidator('json', updateWorkflowSchema),
  async (c) => {
    const data = c.req.valid('json');
    const workflow = await updateWorkflow(c.env.DB, c.req.param('id'), data);
    return c.json({ data: workflow });
  },
);

// DELETE /workflows/:id
workflowRoutes.delete('/workflows/:id', async (c) => {
  await deleteWorkflow(c.env.DB, c.req.param('id'));
  return c.json({ data: { message: 'Workflow deleted' } });
});

// POST /workflows/:id/validate
workflowRoutes.post(
  '/workflows/:id/validate',
  zValidator('json', validateTransitionSchema),
  async (c) => {
    const { from, to } = c.req.valid('json');
    const isValid = await validateTransition(c.env.DB, c.req.param('id'), from, to);
    return c.json({ data: { valid: isValid } });
  },
);
