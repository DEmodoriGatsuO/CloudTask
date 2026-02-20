import { cors } from 'hono/cors';
import type { AppEnv } from '../env';
import { createMiddleware } from 'hono/factory';

export const corsMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const allowedOrigins = ['http://localhost:5173', 'http://localhost:8787'];

  // Add production origins from environment variable
  const envOrigins = c.env.ALLOWED_ORIGINS;
  if (envOrigins) {
    allowedOrigins.push(...envOrigins.split(',').map((o) => o.trim()));
  }

  const handler = cors({
    origin: (origin) => {
      // Allow exact matches
      if (allowedOrigins.includes(origin)) return origin;
      // Allow Pages preview deployments (*.cloudtask-web.pages.dev)
      if (/^https:\/\/[a-z0-9-]+\.cloudtask-web\.pages\.dev$/.test(origin)) return origin;
      return null;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400,
  });

  return handler(c, next);
});
