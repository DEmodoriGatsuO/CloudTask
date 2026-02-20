import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '../env';
import type { TaskStatus, TaskPriority } from '@cloudtask/shared';
import { createTaskSchema, updateTaskSchema, batchUpdateTasksSchema, batchDeleteTasksSchema } from '@cloudtask/shared';
import { createTask, getTaskById, getTasksByProject, updateTask, deleteTask, getSubTasks } from '../services/task.service';
import type { TaskSortOptions } from '../services/task.service';
import { logActivity } from '../services/activity.service';
import { notifyOnAssignment, notifyOnStatusChange } from '../services/notification.service';
import { addLabelToTask, removeLabelFromTask } from '../services/label.service';
import { NotFoundError } from '../errors/app-error';

export const taskRoutes = new Hono<AppEnv>();

// GET /
taskRoutes.get('/', async (c) => {
  const projectId = c.req.query('project_id');
  if (!projectId) return c.json({ error: { message: 'project_id required' } }, 400);

  const page = parseInt(c.req.query('page') || '1');
  const pageSize = parseInt(c.req.query('pageSize') || '50');
  const dueBefore = c.req.query('due_before');
  const dueAfter = c.req.query('due_after');
  const filters = {
    status: c.req.query('status')?.split(',') as TaskStatus[] | undefined,
    priority: c.req.query('priority')?.split(',') as TaskPriority[] | undefined,
    assigneeId: c.req.query('assignee_id'),
    search: c.req.query('search'),
    dueBefore: dueBefore ? parseInt(dueBefore) : undefined,
    dueAfter: dueAfter ? parseInt(dueAfter) : undefined,
  };
  const sort: TaskSortOptions = {
    sortBy: c.req.query('sort_by') as TaskSortOptions['sortBy'],
    sortOrder: c.req.query('sort_order') as TaskSortOptions['sortOrder'],
  };

  const result = await getTasksByProject(c.env.DB, projectId, filters, { page, pageSize }, sort);
  return c.json(result);
});

// POST /
taskRoutes.post('/', zValidator('json', createTaskSchema), async (c) => {
  const data = c.req.valid('json');
  const userId = c.get('userId');
  const task = await createTask(c.env.DB, data, userId);
  await logActivity(c.env.DB, { projectId: task.projectId, taskId: task.id, userId, action: 'created', details: JSON.stringify({ title: task.title }) });

  if (data.assigneeId) {
    await notifyOnAssignment(c.env.DB, task.id, task.title, data.assigneeId, userId);
  }

  return c.json({ data: task }, 201);
});

// GET /project-dependencies - must be before /:id to avoid shadowing
taskRoutes.get('/project-dependencies', async (c) => {
  const projectId = c.req.query('project_id');
  if (!projectId) return c.json({ error: { message: 'project_id required' } }, 400);
  const deps = await c.env.DB.prepare(
    `SELECT td.task_id, td.depends_on_task_id,
            t1.title AS task_title, t2.title AS depends_on_task_title
     FROM task_dependencies td
     INNER JOIN tasks t1 ON t1.id = td.task_id
     INNER JOIN tasks t2 ON t2.id = td.depends_on_task_id
     WHERE t1.project_id = ?`,
  ).bind(projectId).all();
  type DepRow = { task_id: string; task_title: string; depends_on_task_id: string; depends_on_task_title: string };
  const data = (deps.results as DepRow[]).map((r) => ({
    taskId: r.task_id,
    taskTitle: r.task_title,
    dependsOnTaskId: r.depends_on_task_id,
    dependsOnTaskTitle: r.depends_on_task_title,
  }));
  return c.json({ data });
});

// GET /:id
taskRoutes.get('/:id', async (c) => {
  const task = await getTaskById(c.env.DB, c.req.param('id'));
  if (!task) throw new NotFoundError('Task not found');
  return c.json({ data: task });
});

// GET /:id/subtasks
taskRoutes.get('/:id/subtasks', async (c) => {
  const subtasks = await getSubTasks(c.env.DB, c.req.param('id'));
  return c.json({ data: subtasks });
});

// PATCH /:id
taskRoutes.patch('/:id', zValidator('json', updateTaskSchema), async (c) => {
  const taskId = c.req.param('id');
  const data = c.req.valid('json');
  const userId = c.get('userId');

  const oldTask = await getTaskById(c.env.DB, taskId);
  if (!oldTask) throw new NotFoundError('Task not found');

  const task = await updateTask(c.env.DB, taskId, data);

  // Log and notify on status change
  if (data.status && data.status !== oldTask.status) {
    await logActivity(c.env.DB, { projectId: task.projectId, taskId, userId, action: 'status_changed', details: JSON.stringify({ from: oldTask.status, to: data.status }) });
    await notifyOnStatusChange(c.env.DB, taskId, task.title, userId, task.projectId);
  } else {
    await logActivity(c.env.DB, { projectId: task.projectId, taskId, userId, action: 'updated', details: JSON.stringify(data) });
  }

  // Notify on assignment change
  if (data.assigneeId && data.assigneeId !== oldTask.assigneeId) {
    await notifyOnAssignment(c.env.DB, taskId, task.title, data.assigneeId, userId);
  }

  return c.json({ data: task });
});

// DELETE /:id
taskRoutes.delete('/:id', async (c) => {
  const task = await getTaskById(c.env.DB, c.req.param('id'));
  if (!task) throw new NotFoundError('Task not found');
  await deleteTask(c.env.DB, c.req.param('id'));
  await logActivity(c.env.DB, { projectId: task.projectId, taskId: task.id, userId: c.get('userId'), action: 'deleted', details: JSON.stringify({ title: task.title }) });
  return c.json({ data: { message: 'Task deleted' } });
});

// POST /batch/update - Batch update tasks
taskRoutes.post('/batch/update', zValidator('json', batchUpdateTasksSchema), async (c) => {
  const userId = c.get('userId');
  const { taskIds, data } = c.req.valid('json');

  const results = await Promise.allSettled(
    taskIds.map(async (taskId) => {
      const oldTask = await getTaskById(c.env.DB, taskId);
      if (!oldTask) throw new Error('Task not found');
      const task = await updateTask(c.env.DB, taskId, data);
      if (data.status && data.status !== oldTask.status) {
        await logActivity(c.env.DB, { projectId: task.projectId, taskId, userId, action: 'status_changed', details: JSON.stringify({ from: oldTask.status, to: data.status }) });
        await notifyOnStatusChange(c.env.DB, taskId, task.title, userId, task.projectId);
      }
      return task;
    }),
  );

  const succeeded = results
    .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof updateTask>>> => r.status === 'fulfilled')
    .map((r) => r.value);
  const failed = results
    .flatMap((r, i) => r.status === 'rejected' ? [{ id: taskIds[i], error: (r.reason as Error)?.message || 'Unknown error' }] : []);

  const status = failed.length === 0 ? 200 : succeeded.length === 0 ? 422 : 207;
  return c.json({ data: { succeeded, failed } }, status as 200 | 207 | 422);
});

// POST /batch/delete - Batch delete tasks
taskRoutes.post('/batch/delete', zValidator('json', batchDeleteTasksSchema), async (c) => {
  const userId = c.get('userId');
  const { taskIds } = c.req.valid('json');

  const results = await Promise.allSettled(
    taskIds.map(async (taskId) => {
      const task = await getTaskById(c.env.DB, taskId);
      if (!task) throw new Error('Task not found');
      await deleteTask(c.env.DB, taskId);
      await logActivity(c.env.DB, { projectId: task.projectId, taskId, userId, action: 'deleted', details: JSON.stringify({ title: task.title }) });
      return taskId;
    }),
  );

  const succeeded = results
    .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
    .map((r) => r.value);
  const failed = results
    .flatMap((r, i) => r.status === 'rejected' ? [{ id: taskIds[i], error: (r.reason as Error)?.message || 'Unknown error' }] : []);

  const status = failed.length === 0 ? 200 : succeeded.length === 0 ? 422 : 207;
  return c.json({ data: { succeeded, failed } }, status as 200 | 207 | 422);
});

// GET /:id/dependencies - Dependencies for a single task (with task titles)
taskRoutes.get('/:id/dependencies', async (c) => {
  const taskId = c.req.param('id');
  const deps = await c.env.DB.prepare(
    `SELECT td.task_id, td.depends_on_task_id,
            t1.title AS task_title, t2.title AS depends_on_task_title
     FROM task_dependencies td
     INNER JOIN tasks t1 ON t1.id = td.task_id
     INNER JOIN tasks t2 ON t2.id = td.depends_on_task_id
     WHERE td.task_id = ? OR td.depends_on_task_id = ?`,
  ).bind(taskId, taskId).all();
  type DepRow = { task_id: string; task_title: string; depends_on_task_id: string; depends_on_task_title: string };
  const data = (deps.results as DepRow[]).map((r) => ({
    taskId: r.task_id,
    taskTitle: r.task_title,
    dependsOnTaskId: r.depends_on_task_id,
    dependsOnTaskTitle: r.depends_on_task_title,
  }));
  return c.json({ data });
});

// POST /:id/dependencies - Add dependency
taskRoutes.post('/:id/dependencies', async (c) => {
  const taskId = c.req.param('id');
  const body = await c.req.json<{ dependsOnTaskId: string }>();
  const { dependsOnTaskId } = body;
  if (!dependsOnTaskId) return c.json({ error: { message: 'dependsOnTaskId required' } }, 400);
  if (taskId === dependsOnTaskId) return c.json({ error: { message: 'Task cannot depend on itself' } }, 400);
  await c.env.DB.prepare(
    `INSERT OR IGNORE INTO task_dependencies (task_id, depends_on_task_id) VALUES (?, ?)`,
  ).bind(taskId, dependsOnTaskId).run();
  return c.json({ data: { taskId, dependsOnTaskId } }, 201);
});

// DELETE /:id/dependencies/:depId - Remove dependency
taskRoutes.delete('/:id/dependencies/:depId', async (c) => {
  const taskId = c.req.param('id');
  const depId = c.req.param('depId');
  await c.env.DB.prepare(
    `DELETE FROM task_dependencies WHERE task_id = ? AND depends_on_task_id = ?`,
  ).bind(taskId, depId).run();
  return c.json({ data: { message: 'Dependency removed' } });
});

// POST /:id/labels/:labelId
taskRoutes.post('/:id/labels/:labelId', async (c) => {
  await addLabelToTask(c.env.DB, c.req.param('id'), c.req.param('labelId'));
  return c.json({ data: { message: 'Label added' } });
});

// DELETE /:id/labels/:labelId
taskRoutes.delete('/:id/labels/:labelId', async (c) => {
  await removeLabelFromTask(c.env.DB, c.req.param('id'), c.req.param('labelId'));
  return c.json({ data: { message: 'Label removed' } });
});
