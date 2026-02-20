import type { ErrorHandler } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { AppError } from '../errors/app-error';
import type { AppEnv } from '../env';

export const errorHandler: ErrorHandler<AppEnv> = (err, c) => {
  console.error(JSON.stringify({
    level: 'error',
    message: err.message,
    stack: err.stack,
    timestamp: Date.now(),
  }));

  if (err instanceof AppError) {
    return c.json(
      { error: { message: err.message, code: err.code } },
      err.statusCode as ContentfulStatusCode,
    );
  }

  return c.json(
    { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
    500,
  );
};
