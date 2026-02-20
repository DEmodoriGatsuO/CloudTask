import { Hono } from 'hono';
import type { AppEnv } from '../env';
import type { Task } from '@cloudtask/shared';
import { generateId, nowUnix } from '@cloudtask/shared';
import { toCamelCase } from '../db/queries';
import { logActivity } from '../services/activity.service';
import { NotFoundError, ValidationError } from '../errors/app-error';

export const csvRoutes = new Hono<AppEnv>();

// ─── CSV helpers ────────────────────────────────────────────────────────────

function escapeCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Quote fields that contain comma, double-quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function rowToCsv(values: (string | number | null | undefined)[]): string {
  return values.map(escapeCsvField).join(',');
}

const CSV_HEADERS = [
  'title',
  'description',
  'status',
  'priority',
  'assignee_email',
  'due_date',
  'start_date',
  'end_date',
  'estimated_hours',
];

function unixToDateString(unix: number | null | undefined): string {
  if (!unix) return '';
  return new Date(unix * 1000).toISOString().slice(0, 10); // YYYY-MM-DD
}

function dateStringToUnix(dateStr: string): number | null {
  if (!dateStr.trim()) return null;
  const ts = Date.parse(dateStr.trim());
  if (isNaN(ts)) return null;
  return Math.floor(ts / 1000);
}

// Parse a single CSV line, handling quoted fields
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let i = 0;
  while (i <= line.length) {
    if (i === line.length) {
      fields.push('');
      break;
    }
    if (line[i] === '"') {
      // quoted field
      i++;
      let field = '';
      while (i < line.length) {
        if (line[i] === '"') {
          if (line[i + 1] === '"') {
            field += '"';
            i += 2;
          } else {
            i++; // closing quote
            break;
          }
        } else {
          field += line[i];
          i++;
        }
      }
      fields.push(field);
      // skip comma
      if (line[i] === ',') i++;
    } else {
      const end = line.indexOf(',', i);
      if (end === -1) {
        fields.push(line.slice(i));
        break;
      }
      fields.push(line.slice(i, end));
      i = end + 1;
    }
  }
  return fields;
}

// Parse full CSV text → array of objects keyed by header row
function parseCsv(text: string): Record<string, string>[] {
  // Normalize line endings
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? '';
    });
    rows.push(row);
  }

  return rows;
}

// ─── Export ─────────────────────────────────────────────────────────────────

// GET /projects/:projectId/tasks/export
csvRoutes.get('/projects/:projectId/tasks/export', async (c) => {
  const projectId = c.req.param('projectId');

  // Verify project exists
  const project = await c.env.DB.prepare('SELECT id, name FROM projects WHERE id = ?')
    .bind(projectId).first();
  if (!project) throw new NotFoundError('Project not found');

  // Build optional filters (same query params as task list)
  let whereClause = 'WHERE t.project_id = ?';
  const bindValues: unknown[] = [projectId];

  const status = c.req.query('status');
  if (status) {
    const statuses = status.split(',');
    whereClause += ` AND t.status IN (${statuses.map(() => '?').join(',')})`;
    bindValues.push(...statuses);
  }

  const priority = c.req.query('priority');
  if (priority) {
    const priorities = priority.split(',');
    whereClause += ` AND t.priority IN (${priorities.map(() => '?').join(',')})`;
    bindValues.push(...priorities);
  }

  const assigneeId = c.req.query('assignee_id');
  if (assigneeId) {
    whereClause += ' AND t.assignee_id = ?';
    bindValues.push(assigneeId);
  }

  const search = c.req.query('search');
  if (search) {
    whereClause += ' AND (t.title LIKE ? OR t.description LIKE ?)';
    bindValues.push(`%${search}%`, `%${search}%`);
  }

  const results = await c.env.DB.prepare(
    `SELECT t.*, u.email as assignee_email
     FROM tasks t
     LEFT JOIN users u ON u.id = t.assignee_id
     ${whereClause}
     ORDER BY t.sort_order ASC, t.created_at ASC`,
  ).bind(...bindValues).all();

  type TaskRow = { title: string; description: string | null; status: string; priority: string; assignee_email: string | null; due_date: number | null; start_date: number | null; end_date: number | null; estimated_hours: number | null };
  const tasks = results.results as TaskRow[];

  // Build CSV
  const csvLines: string[] = [CSV_HEADERS.join(',')];
  for (const task of tasks) {
    csvLines.push(rowToCsv([
      task.title,
      task.description,
      task.status,
      task.priority,
      task.assignee_email,
      unixToDateString(task.due_date),
      unixToDateString(task.start_date),
      unixToDateString(task.end_date),
      task.estimated_hours,
    ]));
  }

  const csv = csvLines.join('\n');
  const filename = `tasks-${(project.name as string).replace(/[^a-zA-Z0-9_-]/g, '_')}-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
});

// ─── Import ─────────────────────────────────────────────────────────────────

// POST /projects/:projectId/tasks/import  (multipart/form-data, field: "file")
csvRoutes.post('/projects/:projectId/tasks/import', async (c) => {
  const projectId = c.req.param('projectId');
  const userId = c.get('userId');

  // Verify project exists
  const project = await c.env.DB.prepare('SELECT id FROM projects WHERE id = ?')
    .bind(projectId).first();
  if (!project) throw new NotFoundError('Project not found');

  // Parse multipart form
  let csvText: string;
  try {
    const formData = await c.req.formData();
    const file = formData.get('file');
    if (!file || typeof file === 'string') {
      throw new ValidationError('CSV file is required (field name: "file")');
    }
    csvText = await (file as File).text();
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    throw new ValidationError('Failed to parse multipart form data');
  }

  const rows = parseCsv(csvText);
  if (rows.length === 0) {
    throw new ValidationError('CSV file is empty or has no data rows');
  }

  // Validate required column exists
  if (!('title' in rows[0])) {
    throw new ValidationError('CSV must have a "title" column header');
  }

  // Preload member emails for assignee lookup
  const memberRows = await c.env.DB.prepare(
    `SELECT u.id, u.email FROM users u
     INNER JOIN project_members pm ON pm.user_id = u.id
     WHERE pm.project_id = ?`,
  ).bind(projectId).all();
  type MemberRow = { id: string; email: string };
  const emailToUserId: Record<string, string> = {};
  for (const m of memberRows.results as MemberRow[]) {
    emailToUserId[m.email] = m.id;
  }

  const VALID_STATUSES = new Set(['todo', 'in_progress', 'done', 'completed']);
  const VALID_PRIORITIES = new Set(['low', 'medium', 'high']);

  const created: Task[] = [];
  const errors: { row: number; message: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // 1-based, header is row 1

    const title = row['title']?.trim();
    if (!title) {
      errors.push({ row: rowNum, message: 'title is required' });
      continue;
    }

    const status = row['status']?.trim().toLowerCase() || 'todo';
    if (!VALID_STATUSES.has(status)) {
      errors.push({ row: rowNum, message: `Invalid status "${status}". Must be one of: todo, in_progress, done, completed` });
      continue;
    }

    const priority = row['priority']?.trim().toLowerCase() || 'medium';
    if (!VALID_PRIORITIES.has(priority)) {
      errors.push({ row: rowNum, message: `Invalid priority "${priority}". Must be one of: low, medium, high` });
      continue;
    }

    let assigneeId: string | null = null;
    const assigneeEmail = row['assignee_email']?.trim();
    if (assigneeEmail) {
      assigneeId = emailToUserId[assigneeEmail] ?? null;
      if (!assigneeId) {
        errors.push({ row: rowNum, message: `Assignee email "${assigneeEmail}" is not a project member` });
        continue;
      }
    }

    const dueDate = dateStringToUnix(row['due_date'] || '');
    const startDate = dateStringToUnix(row['start_date'] || '');
    const endDate = dateStringToUnix(row['end_date'] || '');
    const estimatedHoursRaw = row['estimated_hours']?.trim();
    const estimatedHours = estimatedHoursRaw ? parseFloat(estimatedHoursRaw) : null;

    if (estimatedHoursRaw && (isNaN(estimatedHours!) || estimatedHours! < 0)) {
      errors.push({ row: rowNum, message: `Invalid estimated_hours "${estimatedHoursRaw}"` });
      continue;
    }

    // Get sort order
    const maxOrder = await c.env.DB.prepare(
      'SELECT MAX(sort_order) as max_order FROM tasks WHERE project_id = ? AND status = ?',
    ).bind(projectId, status).first<{ max_order: number | null }>();
    const sortOrder = (maxOrder?.max_order || 0) + 1;

    const id = generateId('tsk');
    const now = nowUnix();

    await c.env.DB.prepare(
      `INSERT INTO tasks (id, project_id, title, description, status, priority, assignee_id, reporter_id,
        due_date, start_date, end_date, estimated_hours, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      id, projectId, title, row['description']?.trim() || null,
      status, priority, assigneeId, userId,
      dueDate, startDate, endDate, estimatedHours, sortOrder, now, now,
    ).run();

    const task = await c.env.DB.prepare('SELECT * FROM tasks WHERE id = ?').bind(id).first();
    if (task) {
      created.push(toCamelCase(task));
    }

    await logActivity(c.env.DB, {
      projectId,
      taskId: id,
      userId,
      action: 'created',
      details: JSON.stringify({ title, source: 'csv_import' }),
    });
  }

  return c.json({
    data: {
      created: created.length,
      errors,
      tasks: created,
    },
  }, 201);
});
