import type { Context } from 'hono';

export interface Bindings {
  DB: D1Database;
  SESSIONS: KVNamespace;
  CACHE: KVNamespace;
  FILES: R2Bucket;
  NOTIFICATIONS: DurableObjectNamespace;
  JWT_SECRET: string;
  JWT_EXPIRY: string;
  ALLOWED_ORIGINS?: string;
}

export interface Variables {
  userId: string;
  jti: string;
}

export type AppEnv = {
  Bindings: Bindings;
  Variables: Variables;
};

export type AppContext = Context<AppEnv>;
