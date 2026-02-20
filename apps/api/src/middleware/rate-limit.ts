import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../env';

// NOTE: KV-based rate limiting is disabled to stay within Cloudflare free plan limits.
// Every request previously consumed 1 KV read + 1 KV write (CACHE namespace),
// which caused the daily write quota (1,000/day) to be exceeded quickly.
//
// Alternatives for production use:
//   - Cloudflare WAF rate limiting rules (Dashboard > Security > WAF)
//   - Cloudflare Workers Rate Limiting API (workers-rs binding)
//
// Original config: 100 requests / 60 seconds per IP
// const WINDOW_MS = 60_000;
// const MAX_REQUESTS = 100;

export const rateLimitMiddleware = createMiddleware<AppEnv>(async (_c, next) => {
  await next();
});
