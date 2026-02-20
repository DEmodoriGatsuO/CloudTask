import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../env';

export const loggerMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;
  console.log(JSON.stringify({
    level: 'info',
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    duration,
    timestamp: start,
  }));
});
