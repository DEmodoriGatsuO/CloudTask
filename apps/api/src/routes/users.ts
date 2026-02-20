import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { getUserById, updateUser, searchUsers } from '../services/user.service';
import { NotFoundError, ForbiddenError } from '../errors/app-error';

export const userRoutes = new Hono<AppEnv>();

// GET /search
userRoutes.get('/search', async (c) => {
  const q = c.req.query('q') || '';
  const users = await searchUsers(c.env.DB, q);
  return c.json({ data: users });
});

// GET /:id
userRoutes.get('/:id', async (c) => {
  const user = await getUserById(c.env.DB, c.req.param('id'));
  if (!user) throw new NotFoundError('User not found');
  return c.json({ data: user });
});

// PATCH /:id
userRoutes.patch('/:id', async (c) => {
  const targetId = c.req.param('id');
  const userId = c.get('userId');
  if (targetId !== userId) throw new ForbiddenError('Can only update own profile');

  const body = await c.req.json();
  const user = await updateUser(c.env.DB, targetId, {
    displayName: body.displayName,
    avatarUrl: body.avatarUrl,
  });
  return c.json({ data: user });
});
