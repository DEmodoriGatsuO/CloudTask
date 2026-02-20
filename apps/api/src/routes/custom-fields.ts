import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AppEnv } from '../env';
import {
  createFieldDefinition,
  getFieldDefinitions,
  updateFieldDefinition,
  deleteFieldDefinition,
  getFieldValues,
  setFieldValue,
} from '../services/custom-field.service';
import { NotFoundError } from '../errors/app-error';

const createFieldSchema = z.object({
  name: z.string().min(1).max(200),
  fieldType: z.enum(['text', 'number', 'date', 'select']),
  options: z.array(z.string()).optional(),
  required: z.boolean().optional(),
});

const updateFieldSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  fieldType: z.enum(['text', 'number', 'date', 'select']).optional(),
  options: z.array(z.string()).optional(),
  required: z.boolean().optional(),
});

const setValueSchema = z.object({
  value: z.string().nullable(),
});

export const customFieldRoutes = new Hono<AppEnv>();

// GET /projects/:projectId/custom-fields
customFieldRoutes.get('/projects/:projectId/custom-fields', async (c) => {
  const projectId = c.req.param('projectId');
  const definitions = await getFieldDefinitions(c.env.DB, projectId);
  return c.json({ data: definitions });
});

// POST /projects/:projectId/custom-fields
customFieldRoutes.post(
  '/projects/:projectId/custom-fields',
  zValidator('json', createFieldSchema),
  async (c) => {
    const projectId = c.req.param('projectId');
    const data = c.req.valid('json');
    const definition = await createFieldDefinition(c.env.DB, projectId, data);
    return c.json({ data: definition }, 201);
  },
);

// PATCH /custom-fields/:id
customFieldRoutes.patch(
  '/custom-fields/:id',
  zValidator('json', updateFieldSchema),
  async (c) => {
    const data = c.req.valid('json');
    const definition = await updateFieldDefinition(c.env.DB, c.req.param('id'), data);
    return c.json({ data: definition });
  },
);

// DELETE /custom-fields/:id
customFieldRoutes.delete('/custom-fields/:id', async (c) => {
  await deleteFieldDefinition(c.env.DB, c.req.param('id'));
  return c.json({ data: { message: 'Custom field deleted' } });
});

// GET /tasks/:taskId/custom-field-values
customFieldRoutes.get('/tasks/:taskId/custom-field-values', async (c) => {
  const taskId = c.req.param('taskId');
  const values = await getFieldValues(c.env.DB, taskId);
  return c.json({ data: values });
});

// PUT /tasks/:taskId/custom-field-values/:fieldId
customFieldRoutes.put(
  '/tasks/:taskId/custom-field-values/:fieldId',
  zValidator('json', setValueSchema),
  async (c) => {
    const taskId = c.req.param('taskId');
    const fieldId = c.req.param('fieldId');
    const { value } = c.req.valid('json');
    const result = await setFieldValue(c.env.DB, taskId, fieldId, value);
    return c.json({ data: result });
  },
);
