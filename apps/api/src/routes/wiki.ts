import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AppEnv } from '../env';
import {
  createWikiPage,
  getWikiPageById,
  getWikiPagesByProject,
  updateWikiPage,
  deleteWikiPage,
  getWikiPageVersions,
  searchWikiPages,
} from '../services/wiki.service';
import { logActivity } from '../services/activity.service';
import { NotFoundError } from '../errors/app-error';

const createWikiPageSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().min(1),
  parentPageId: z.string().optional(),
});

const updateWikiPageSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.string().min(1).optional(),
  parentPageId: z.union([z.string(), z.null()]).optional(),
});

export const wikiRoutes = new Hono<AppEnv>();

// GET /projects/:projectId/wiki - list wiki pages for a project (paginated)
wikiRoutes.get('/projects/:projectId/wiki', async (c) => {
  const projectId = c.req.param('projectId');
  const page = parseInt(c.req.query('page') || '1');
  const pageSize = parseInt(c.req.query('pageSize') || '50');

  const result = await getWikiPagesByProject(c.env.DB, projectId, { page, pageSize });
  return c.json(result);
});

// GET /projects/:projectId/wiki/search - search wiki pages
wikiRoutes.get('/projects/:projectId/wiki/search', async (c) => {
  const projectId = c.req.param('projectId');
  const query = c.req.query('q');
  if (!query) return c.json({ error: { message: 'Search query "q" is required' } }, 400);

  const results = await searchWikiPages(c.env.DB, projectId, query);
  return c.json({ data: results });
});

// POST /projects/:projectId/wiki - create a new wiki page
wikiRoutes.post('/projects/:projectId/wiki', zValidator('json', createWikiPageSchema), async (c) => {
  const projectId = c.req.param('projectId');
  const data = c.req.valid('json');
  const userId = c.get('userId');

  const page = await createWikiPage(c.env.DB, projectId, data, userId);

  await logActivity(c.env.DB, {
    projectId,
    userId,
    action: 'wiki_created',
    details: JSON.stringify({ title: page.title }),
  });

  return c.json({ data: page }, 201);
});

// GET /wiki/:id - get a single wiki page with meta
wikiRoutes.get('/wiki/:id', async (c) => {
  const page = await getWikiPageById(c.env.DB, c.req.param('id'));
  if (!page) throw new NotFoundError('Wiki page not found');
  return c.json({ data: page });
});

// PATCH /wiki/:id - update a wiki page
wikiRoutes.patch('/wiki/:id', zValidator('json', updateWikiPageSchema), async (c) => {
  const id = c.req.param('id');
  const data = c.req.valid('json');
  const userId = c.get('userId');

  const page = await updateWikiPage(c.env.DB, id, data, userId);

  await logActivity(c.env.DB, {
    projectId: page.projectId,
    userId,
    action: 'wiki_updated',
    details: JSON.stringify({ title: page.title }),
  });

  return c.json({ data: page });
});

// DELETE /wiki/:id - delete a wiki page
wikiRoutes.delete('/wiki/:id', async (c) => {
  const page = await getWikiPageById(c.env.DB, c.req.param('id'));
  if (!page) throw new NotFoundError('Wiki page not found');

  await deleteWikiPage(c.env.DB, c.req.param('id'));

  await logActivity(c.env.DB, {
    projectId: page.projectId,
    userId: c.get('userId'),
    action: 'wiki_deleted',
    details: JSON.stringify({ title: page.title }),
  });

  return c.json({ data: { message: 'Wiki page deleted' } });
});

// GET /wiki/:id/versions - get version history for a wiki page
wikiRoutes.get('/wiki/:id/versions', async (c) => {
  const pageId = c.req.param('id');
  const page = parseInt(c.req.query('page') || '1');
  const pageSize = parseInt(c.req.query('pageSize') || '20');

  const result = await getWikiPageVersions(c.env.DB, pageId, { page, pageSize });
  return c.json(result);
});
