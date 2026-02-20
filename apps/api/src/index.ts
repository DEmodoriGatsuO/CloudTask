import { Hono } from 'hono';
import type { AppEnv } from './env';
import { corsMiddleware } from './middleware/cors';
import { errorHandler } from './middleware/error-handler';
import { loggerMiddleware } from './middleware/logger';
import { authMiddleware } from './middleware/auth';
import { rateLimitMiddleware } from './middleware/rate-limit';
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/users';
import { projectRoutes } from './routes/projects';
import { taskRoutes } from './routes/tasks';
import { commentRoutes } from './routes/comments';
import { labelRoutes } from './routes/labels';
import { notificationRoutes } from './routes/notifications';
import { activityRoutes } from './routes/activity';
// Phase 3: Collaboration
import { wikiRoutes } from './routes/wiki';
import { attachmentRoutes } from './routes/attachments';
// Phase 4: Advanced Features
import { workflowRoutes } from './routes/workflows';
import { automationRoutes } from './routes/automations';
import { customFieldRoutes } from './routes/custom-fields';
import { templateRoutes } from './routes/templates';
import { dashboardRoutes } from './routes/dashboard';
import { reportsRoutes } from './routes/reports';
import { csvRoutes } from './routes/csv';
import { NotificationManager } from './durable-objects/notification-manager';
import { DELETE_STATEMENTS, SEED_SQL } from './seed-data';
import type { Bindings } from './env';

const app = new Hono<AppEnv>();

// Global middleware
app.use('*', corsMiddleware);
app.use('*', loggerMiddleware);
app.use('*', rateLimitMiddleware);
app.onError(errorHandler);

// Health check
app.get('/api/v1/health', (c) => {
  return c.json({ status: 'ok', timestamp: Date.now() });
});

// Auth routes (public + protected mixed)
app.route('/api/v1/auth', authRoutes);

// Protected routes - auth middleware
app.use('/api/v1/*', authMiddleware);

// Resource routes
app.route('/api/v1/dashboard', dashboardRoutes);
app.route('/api/v1/users', userRoutes);
app.route('/api/v1/projects', projectRoutes);
app.route('/api/v1/tasks', taskRoutes);
app.route('/api/v1/comments', commentRoutes);
app.route('/api/v1/labels', labelRoutes);
app.route('/api/v1/notifications', notificationRoutes);
app.route('/api/v1/activity', activityRoutes);

// Phase 2: Visualization routes
app.route('/api/v1', reportsRoutes);

// CSV Import/Export routes
app.route('/api/v1', csvRoutes);

// Phase 3: Collaboration routes
app.route('/api/v1', wikiRoutes);
app.route('/api/v1', attachmentRoutes);

// Phase 4: Advanced Feature routes
app.route('/api/v1', workflowRoutes);
app.route('/api/v1', automationRoutes);
app.route('/api/v1', customFieldRoutes);
app.route('/api/v1', templateRoutes);

// Export Durable Object
export { NotificationManager };

export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    console.log('[Cron] Seed data reset started at', new Date().toISOString());

    const db = env.DB;

    // Delete all existing data (order matters due to foreign keys)
    for (const stmt of DELETE_STATEMENTS) {
      await db.exec(stmt);
    }
    console.log('[Cron] Existing data deleted');

    // Re-insert seed data
    await db.exec(SEED_SQL);
    console.log('[Cron] Seed data re-inserted');

    console.log('[Cron] Seed data reset completed at', new Date().toISOString());
  },
};
