import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '../env';
import { createProjectSchema, updateProjectSchema, addMemberSchema } from '@cloudtask/shared';
import {
  createProject, getProjectById, getProjectsByUserId, updateProject,
  deleteProject, addMember, removeMember, getMembers,
} from '../services/project.service';
import { logActivity } from '../services/activity.service';
import { requireProjectAccess } from '../middleware/project-access';
import { NotFoundError } from '../errors/app-error';

export const projectRoutes = new Hono<AppEnv>();

// GET /
projectRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  const page = parseInt(c.req.query('page') || '1');
  const pageSize = parseInt(c.req.query('pageSize') || '20');
  const result = await getProjectsByUserId(c.env.DB, userId, { page, pageSize });
  return c.json(result);
});

// POST /
projectRoutes.post('/', zValidator('json', createProjectSchema), async (c) => {
  const data = c.req.valid('json');
  const userId = c.get('userId');
  const project = await createProject(c.env.DB, data, userId);
  await logActivity(c.env.DB, { projectId: project.id, userId, action: 'created', details: JSON.stringify({ type: 'project', name: project.name }) });
  return c.json({ data: project }, 201);
});

// GET /:id
projectRoutes.get('/:id', requireProjectAccess('viewer'), async (c) => {
  const project = await getProjectById(c.env.DB, c.req.param('id'));
  if (!project) throw new NotFoundError('Project not found');
  return c.json({ data: project });
});

// PATCH /:id
projectRoutes.patch('/:id', requireProjectAccess('project_admin'), zValidator('json', updateProjectSchema), async (c) => {
  const data = c.req.valid('json');
  const project = await updateProject(c.env.DB, c.req.param('id'), data);
  await logActivity(c.env.DB, { projectId: project.id, userId: c.get('userId'), action: 'updated', details: JSON.stringify({ type: 'project', changes: data }) });
  return c.json({ data: project });
});

// DELETE /:id
projectRoutes.delete('/:id', requireProjectAccess('project_admin'), async (c) => {
  await deleteProject(c.env.DB, c.req.param('id'));
  return c.json({ data: { message: 'Project archived' } });
});

// GET /:id/members
projectRoutes.get('/:id/members', requireProjectAccess('viewer'), async (c) => {
  const members = await getMembers(c.env.DB, c.req.param('id'));
  return c.json({ data: members });
});

// POST /:id/members
projectRoutes.post('/:id/members', requireProjectAccess('project_admin'), zValidator('json', addMemberSchema), async (c) => {
  const { userId, role } = c.req.valid('json');
  await addMember(c.env.DB, c.req.param('id'), userId, role);
  await logActivity(c.env.DB, { projectId: c.req.param('id'), userId: c.get('userId'), action: 'member_added', details: JSON.stringify({ addedUserId: userId, role }) });
  return c.json({ data: { message: 'Member added' } }, 201);
});

// DELETE /:id/members/:userId
projectRoutes.delete('/:id/members/:userId', requireProjectAccess('project_admin'), async (c) => {
  await removeMember(c.env.DB, c.req.param('id'), c.req.param('userId'));
  await logActivity(c.env.DB, { projectId: c.req.param('id'), userId: c.get('userId'), action: 'member_removed', details: JSON.stringify({ removedUserId: c.req.param('userId') }) });
  return c.json({ data: { message: 'Member removed' } });
});
