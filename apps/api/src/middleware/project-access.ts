import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../env';
import { ForbiddenError, NotFoundError } from '../errors/app-error';
import { ROLE_HIERARCHY } from '@cloudtask/shared';

type RequiredRole = 'viewer' | 'member' | 'project_admin';

export function requireProjectAccess(requiredRole: RequiredRole = 'member') {
  return createMiddleware<AppEnv>(async (c, next) => {
    const userId = c.get('userId');
    const projectId = c.req.param('id') || c.req.param('projectId');

    if (!projectId) {
      throw new NotFoundError('Project not found');
    }

    // Check if user is system admin
    const user = await c.env.DB.prepare(
      'SELECT role FROM users WHERE id = ?'
    ).bind(userId).first<{ role: string }>();

    if (user?.role === 'admin') {
      await next();
      return;
    }

    const member = await c.env.DB.prepare(
      'SELECT role FROM project_members WHERE user_id = ? AND project_id = ?'
    ).bind(userId, projectId).first<{ role: string }>();

    if (!member) {
      throw new ForbiddenError('You are not a member of this project');
    }

    const userLevel = ROLE_HIERARCHY[member.role] || 0;
    const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;

    if (userLevel < requiredLevel) {
      throw new ForbiddenError('Insufficient permissions');
    }

    await next();
  });
}
