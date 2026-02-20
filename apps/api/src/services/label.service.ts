import { generateId, nowUnix } from '@cloudtask/shared';
import type { Label } from '@cloudtask/shared';
import { toCamelCase, rowsToCamelCase } from '../db/queries';
import { ConflictError } from '../errors/app-error';

export async function createLabel(
  db: D1Database,
  data: { projectId: string; name: string; color: string },
): Promise<Label> {
  const id = generateId('lbl');
  const now = nowUnix();

  try {
    await db.prepare(
      `INSERT INTO labels (id, project_id, name, color, created_at) VALUES (?, ?, ?, ?, ?)`,
    ).bind(id, data.projectId, data.name, data.color, now).run();
  } catch {
    throw new ConflictError('Label with this name already exists');
  }

  return { id, projectId: data.projectId, name: data.name, color: data.color, createdAt: now };
}

export async function getLabelsByProject(db: D1Database, projectId: string): Promise<Label[]> {
  const results = await db.prepare('SELECT * FROM labels WHERE project_id = ? ORDER BY name ASC')
    .bind(projectId).all();
  return rowsToCamelCase<Label>(results.results || []);
}

export async function deleteLabel(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM labels WHERE id = ?').bind(id).run();
}

export async function addLabelToTask(db: D1Database, taskId: string, labelId: string): Promise<void> {
  try {
    await db.prepare('INSERT INTO task_labels (task_id, label_id) VALUES (?, ?)')
      .bind(taskId, labelId).run();
  } catch {
    // Already exists, ignore
  }
}

export async function removeLabelFromTask(db: D1Database, taskId: string, labelId: string): Promise<void> {
  await db.prepare('DELETE FROM task_labels WHERE task_id = ? AND label_id = ?')
    .bind(taskId, labelId).run();
}
