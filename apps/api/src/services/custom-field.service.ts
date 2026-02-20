import { generateId, nowUnix } from '@cloudtask/shared';
import type { CustomFieldDefinition, CustomFieldDefinitionCreate, CustomFieldValue } from '@cloudtask/shared';
import { toCamelCase, rowsToCamelCase } from '../db/queries';
import { NotFoundError } from '../errors/app-error';

function parseDefinitionRow(row: Record<string, any>): CustomFieldDefinition {
  const base = toCamelCase<CustomFieldDefinition>(row);
  return {
    ...base,
    options: typeof row.options === 'string' ? JSON.parse(row.options) : row.options || undefined,
    required: !!(row.required),
  };
}

export async function createFieldDefinition(
  db: D1Database,
  projectId: string,
  data: CustomFieldDefinitionCreate,
): Promise<CustomFieldDefinition> {
  const id = generateId('cfd');
  const now = nowUnix();

  // Get max sort_order
  const maxOrder = await db.prepare(
    'SELECT MAX(sort_order) as max_order FROM custom_field_definitions WHERE project_id = ?',
  ).bind(projectId).first<{ max_order: number | null }>();
  const sortOrder = (maxOrder?.max_order || 0) + 1;

  await db.prepare(
    `INSERT INTO custom_field_definitions (id, project_id, name, field_type, options, required, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    id, projectId, data.name, data.fieldType,
    data.options ? JSON.stringify(data.options) : null,
    data.required ? 1 : 0,
    sortOrder, now,
  ).run();

  return {
    id,
    projectId,
    name: data.name,
    fieldType: data.fieldType,
    options: data.options,
    required: data.required || false,
    sortOrder,
    createdAt: now,
  };
}

export async function getFieldDefinitions(
  db: D1Database,
  projectId: string,
): Promise<CustomFieldDefinition[]> {
  const results = await db.prepare(
    'SELECT * FROM custom_field_definitions WHERE project_id = ? ORDER BY sort_order ASC',
  ).bind(projectId).all();
  return (results.results || []).map(parseDefinitionRow);
}

export async function updateFieldDefinition(
  db: D1Database,
  id: string,
  data: Partial<CustomFieldDefinitionCreate>,
): Promise<CustomFieldDefinition> {
  const sets: string[] = [];
  const values: any[] = [];

  if (data.name !== undefined) {
    sets.push('name = ?');
    values.push(data.name);
  }
  if (data.fieldType !== undefined) {
    sets.push('field_type = ?');
    values.push(data.fieldType);
  }
  if (data.options !== undefined) {
    sets.push('options = ?');
    values.push(JSON.stringify(data.options));
  }
  if (data.required !== undefined) {
    sets.push('required = ?');
    values.push(data.required ? 1 : 0);
  }

  if (sets.length > 0) {
    values.push(id);
    await db.prepare(`UPDATE custom_field_definitions SET ${sets.join(', ')} WHERE id = ?`)
      .bind(...values).run();
  }

  const row = await db.prepare('SELECT * FROM custom_field_definitions WHERE id = ?').bind(id).first();
  if (!row) throw new NotFoundError('Custom field definition not found');
  return parseDefinitionRow(row);
}

export async function deleteFieldDefinition(db: D1Database, id: string): Promise<void> {
  // Delete associated values first, then the definition
  await db.batch([
    db.prepare('DELETE FROM custom_field_values WHERE field_id = ?').bind(id),
    db.prepare('DELETE FROM custom_field_definitions WHERE id = ?').bind(id),
  ]);
}

export async function setFieldValue(
  db: D1Database,
  taskId: string,
  fieldId: string,
  value: string | null,
): Promise<CustomFieldValue> {
  const id = generateId('cfv');

  await db.prepare(
    `INSERT OR REPLACE INTO custom_field_values (id, task_id, field_id, value)
     VALUES (
       COALESCE((SELECT id FROM custom_field_values WHERE task_id = ? AND field_id = ?), ?),
       ?, ?, ?
     )`,
  ).bind(taskId, fieldId, id, taskId, fieldId, value).run();

  const row = await db.prepare(
    'SELECT * FROM custom_field_values WHERE task_id = ? AND field_id = ?',
  ).bind(taskId, fieldId).first();

  return toCamelCase<CustomFieldValue>(row!);
}

export async function getFieldValues(
  db: D1Database,
  taskId: string,
): Promise<CustomFieldValue[]> {
  const results = await db.prepare(
    'SELECT * FROM custom_field_values WHERE task_id = ?',
  ).bind(taskId).all();
  return rowsToCamelCase<CustomFieldValue>(results.results || []);
}

export async function getFieldValuesForProject(
  db: D1Database,
  projectId: string,
  taskIds: string[],
): Promise<CustomFieldValue[]> {
  if (taskIds.length === 0) return [];

  const placeholders = taskIds.map(() => '?').join(',');
  const results = await db.prepare(
    `SELECT cfv.* FROM custom_field_values cfv
     INNER JOIN custom_field_definitions cfd ON cfd.id = cfv.field_id
     WHERE cfd.project_id = ? AND cfv.task_id IN (${placeholders})`,
  ).bind(projectId, ...taskIds).all();

  return rowsToCamelCase<CustomFieldValue>(results.results || []);
}
