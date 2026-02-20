import { generateId, nowUnix } from '@cloudtask/shared';
import type { Task, TaskWithRelations, TaskFilters } from '@cloudtask/shared';
import { toCamelCase, rowsToCamelCase } from '../db/queries';
import { NotFoundError } from '../errors/app-error';
import type { PaginationParams } from '@cloudtask/shared';
import { getOffset, createPaginatedResult } from '@cloudtask/shared';

export async function createTask(
  db: D1Database,
  data: {
    projectId: string;
    title: string;
    description?: string;
    status?: string;
    priority?: string;
    assigneeId?: string;
    parentTaskId?: string;
    dueDate?: number;
    startDate?: number;
    endDate?: number;
    estimatedHours?: number;
    isMilestone?: boolean;
  },
  reporterId: string,
): Promise<Task> {
  const id = generateId('tsk');
  const now = nowUnix();

  // Get max sort_order for the status column
  const maxOrder = await db.prepare(
    'SELECT MAX(sort_order) as max_order FROM tasks WHERE project_id = ? AND status = ?',
  ).bind(data.projectId, data.status || 'todo').first<{ max_order: number | null }>();
  const sortOrder = (maxOrder?.max_order || 0) + 1;

  await db.prepare(
    `INSERT INTO tasks (id, project_id, title, description, status, priority, assignee_id, reporter_id, parent_task_id, due_date, start_date, end_date, estimated_hours, sort_order, is_milestone, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    id, data.projectId, data.title, data.description || null,
    data.status || 'todo', data.priority || 'medium',
    data.assigneeId || null, reporterId,
    data.parentTaskId || null, data.dueDate || null,
    data.startDate || null, data.endDate || null,
    data.estimatedHours || null, sortOrder, data.isMilestone ? 1 : 0, now, now,
  ).run();

  const task = await db.prepare('SELECT * FROM tasks WHERE id = ?').bind(id).first();
  return toCamelCase<Task>({ ...(task as Record<string, unknown>), is_milestone: !!(task as Record<string, unknown>).is_milestone });
}

export async function getTaskById(db: D1Database, id: string): Promise<TaskWithRelations | null> {
  // 単一クエリで task・assignee・reporter・labels・各種カウントを取得
  const rows = await db.prepare(
    `SELECT
       t.*,
       a.id        AS assignee_id_val,
       a.display_name AS assignee_name,
       a.avatar_url   AS assignee_avatar,
       rep.id         AS reporter_id_val,
       rep.display_name AS reporter_name,
       rep.avatar_url   AS reporter_avatar,
       l.id   AS label_id,
       l.name AS label_name,
       l.color AS label_color,
       (SELECT COUNT(*) FROM tasks sub WHERE sub.parent_task_id = t.id) AS sub_task_count,
       (SELECT COUNT(*) FROM comments c WHERE c.task_id = t.id)         AS comment_count
     FROM tasks t
     LEFT JOIN users a   ON a.id = t.assignee_id
     LEFT JOIN users rep ON rep.id = t.reporter_id
     LEFT JOIN task_labels tl ON tl.task_id = t.id
     LEFT JOIN labels l       ON l.id = tl.label_id
     WHERE t.id = ?`,
  ).bind(id).all<Record<string, unknown>>();

  if (!rows.results || rows.results.length === 0) return null;

  // labels が複数行になるためグループ化（最初の行でタスク本体を構築）
  const first = rows.results[0];
  const task = toCamelCase<Task>(first);

  const assignee = first.assignee_id_val
    ? {
        id: first.assignee_id_val as string,
        displayName: first.assignee_name as string,
        avatarUrl: first.assignee_avatar as string | undefined,
      }
    : undefined;

  const reporter = first.reporter_id_val
    ? {
        id: first.reporter_id_val as string,
        displayName: first.reporter_name as string,
        avatarUrl: first.reporter_avatar as string | undefined,
      }
    : { id: task.reporterId, displayName: 'Unknown' };

  const labels = rows.results
    .filter((r) => r.label_id != null)
    .map((r) => ({
      id: r.label_id as string,
      name: r.label_name as string,
      color: r.label_color as string,
    }));

  return {
    ...task,
    isMilestone: !!first.is_milestone,
    progress: (first.progress as number) || 0,
    assignee,
    reporter,
    labels,
    subTaskCount: (first.sub_task_count as number) || 0,
    commentCount: (first.comment_count as number) || 0,
  };
}

const ALLOWED_SORT_COLUMNS: Record<string, string> = {
  title: 't.title',
  priority: "CASE t.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END",
  due_date: 't.due_date',
  created_at: 't.created_at',
  sort_order: 't.sort_order',
};

function getSortClause(sort: TaskSortOptions): string {
  const col = ALLOWED_SORT_COLUMNS[sort.sortBy || 'sort_order'];
  if (!col) return 't.sort_order ASC, t.created_at DESC';
  const dir = sort.sortOrder === 'desc' ? 'DESC' : 'ASC';
  const nulls = dir === 'ASC' ? 'NULLS LAST' : 'NULLS FIRST';
  return `${col} ${dir} ${nulls}, t.created_at DESC`;
}

export interface TaskSortOptions {
  sortBy?: 'title' | 'priority' | 'due_date' | 'created_at' | 'sort_order';
  sortOrder?: 'asc' | 'desc';
}

export async function getTasksByProject(
  db: D1Database,
  projectId: string,
  filters: TaskFilters = {},
  pagination: PaginationParams,
  sort: TaskSortOptions = {},
) {
  let whereClause = 'WHERE t.project_id = ?';
  const bindValues: any[] = [projectId];

  if (filters.status && filters.status.length > 0) {
    whereClause += ` AND t.status IN (${filters.status.map(() => '?').join(',')})`;
    bindValues.push(...filters.status);
  }
  if (filters.priority && filters.priority.length > 0) {
    whereClause += ` AND t.priority IN (${filters.priority.map(() => '?').join(',')})`;
    bindValues.push(...filters.priority);
  }
  if (filters.assigneeId) {
    whereClause += ' AND t.assignee_id = ?';
    bindValues.push(filters.assigneeId);
  }
  if (filters.search) {
    whereClause += ' AND (t.title LIKE ? OR t.description LIKE ?)';
    bindValues.push(`%${filters.search}%`, `%${filters.search}%`);
  }
  if (filters.dueBefore) {
    whereClause += ' AND t.due_date <= ?';
    bindValues.push(filters.dueBefore);
  }
  if (filters.dueAfter) {
    whereClause += ' AND t.due_date >= ?';
    bindValues.push(filters.dueAfter);
  }

  const countResult = await db.prepare(`SELECT COUNT(*) as total FROM tasks t ${whereClause}`)
    .bind(...bindValues).first<{ total: number }>();
  const total = countResult?.total || 0;

  const offset = getOffset(pagination);
  const results = await db.prepare(
    `SELECT t.*, u.display_name as assignee_name, u.avatar_url as assignee_avatar
     FROM tasks t
     LEFT JOIN users u ON u.id = t.assignee_id
     ${whereClause}
     ORDER BY ${getSortClause(sort)}
     LIMIT ? OFFSET ?`,
  ).bind(...bindValues, pagination.pageSize, offset).all();

  const data = (results.results || []).map((row) => {
    const task = toCamelCase<any>(row);
    return {
      ...task,
      isMilestone: !!row.is_milestone,
      progress: row.progress || 0,
      assignee: row.assignee_id ? {
        id: row.assignee_id as string,
        displayName: row.assignee_name as string,
        avatarUrl: row.assignee_avatar as string | undefined,
      } : undefined,
    };
  });

  return createPaginatedResult(data, total, pagination);
}

export async function updateTask(
  db: D1Database,
  id: string,
  data: Record<string, any>,
): Promise<Task> {
  const now = nowUnix();
  const sets: string[] = ['updated_at = ?'];
  const values: any[] = [now];

  const fieldMap: Record<string, string> = {
    title: 'title', description: 'description', status: 'status',
    priority: 'priority', assigneeId: 'assignee_id', parentTaskId: 'parent_task_id',
    dueDate: 'due_date', startDate: 'start_date', endDate: 'end_date',
    actualEndDate: 'actual_end_date', estimatedHours: 'estimated_hours', actualHours: 'actual_hours',
    sortOrder: 'sort_order', isMilestone: 'is_milestone', progress: 'progress',
  };

  for (const [camel, snake] of Object.entries(fieldMap)) {
    if (data[camel] !== undefined) {
      sets.push(`${snake} = ?`);
      values.push(data[camel] === null ? null : data[camel]);
    }
  }

  values.push(id);
  await db.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`).bind(...values).run();

  const task = await db.prepare('SELECT * FROM tasks WHERE id = ?').bind(id).first();
  if (!task) throw new NotFoundError('Task not found');
  return toCamelCase<Task>(task);
}

export async function deleteTask(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM tasks WHERE id = ?').bind(id).run();
}

export async function getSubTasks(db: D1Database, parentTaskId: string): Promise<Task[]> {
  const results = await db.prepare(
    'SELECT * FROM tasks WHERE parent_task_id = ? ORDER BY sort_order ASC',
  ).bind(parentTaskId).all();
  return rowsToCamelCase<Task>(results.results || []);
}

export async function getTasksForGantt(db: D1Database, projectId: string) {
  const tasks = await db.prepare(
    `SELECT t.*, u.display_name as assignee_name
     FROM tasks t LEFT JOIN users u ON u.id = t.assignee_id
     WHERE t.project_id = ? ORDER BY t.sort_order ASC`,
  ).bind(projectId).all();

  const deps = await db.prepare(
    `SELECT td.* FROM task_dependencies td
     INNER JOIN tasks t ON t.id = td.task_id
     WHERE t.project_id = ?`,
  ).bind(projectId).all();

  return {
    tasks: (tasks.results || []).map((r) => ({ ...toCamelCase<any>(r), isMilestone: !!r.is_milestone, progress: r.progress || 0 })),
    dependencies: (deps.results || []).map((r) => toCamelCase<any>(r)),
  };
}
