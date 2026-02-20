import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '../env';
import { registerSchema, loginSchema } from '@cloudtask/shared';
import { createUser, getUserByEmail, getUserById } from '../services/user.service';
import { verifyPassword, generateToken } from '../services/auth.service';
import { UnauthorizedError } from '../errors/app-error';

export const authRoutes = new Hono<AppEnv>();

// POST /register
authRoutes.post('/register', zValidator('json', registerSchema), async (c) => {
  const data = c.req.valid('json');
  const user = await createUser(c.env.DB, data);
  const expiry = parseInt(c.env.JWT_EXPIRY);
  const { token } = await generateToken(user.id, c.env.JWT_SECRET, expiry);
  return c.json({ data: { user, token } }, 201);
});

// POST /login
authRoutes.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json');
  const user = await getUserByEmail(c.env.DB, email);
  if (!user) throw new UnauthorizedError('Invalid email or password');

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) throw new UnauthorizedError('Invalid email or password');

  const expiry = parseInt(c.env.JWT_EXPIRY);
  const { token } = await generateToken(user.id, c.env.JWT_SECRET, expiry);

  const { passwordHash, ...safeUser } = user;
  return c.json({ data: { user: safeUser, token } });
});

// POST /logout
// NOTE: With JWT-only auth (no KV session store), logout is handled client-side
// by discarding the token. The JWT remains technically valid until expiry (7 days),
// which is acceptable for this portfolio use case.
authRoutes.post('/logout', async (c) => {
  return c.json({ data: { message: 'Logged out' } });
});

// GET /me
authRoutes.get('/me', async (c) => {
  const userId = c.get('userId');
  const user = await getUserById(c.env.DB, userId);
  if (!user) throw new UnauthorizedError('User not found');
  return c.json({ data: user });
});
