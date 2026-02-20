import { createMiddleware } from 'hono/factory';
import { verify } from 'hono/jwt';
import type { AppEnv } from '../env';
import { UnauthorizedError } from '../errors/app-error';

const PUBLIC_PATHS = ['/api/v1/auth/register', '/api/v1/auth/login'];

export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  if (PUBLIC_PATHS.includes(c.req.path)) {
    await next();
    return;
  }

  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid authorization header');
  }

  const token = authHeader.substring(7);
  try {
    // Verify JWT signature and expiry only (no KV lookup)
    const payload = await verify(token, c.env.JWT_SECRET, 'HS256');
    const userId = payload.sub as string;
    const jti = payload.jti as string;

    c.set('userId', userId);
    c.set('jti', jti);
    await next();
  } catch (error) {
    if (error instanceof UnauthorizedError) throw error;
    throw new UnauthorizedError('Invalid token');
  }
});
