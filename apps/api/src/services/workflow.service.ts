import { generateId, nowUnix } from '@cloudtask/shared';
import type { Workflow, WorkflowCreate, WorkflowUpdate } from '@cloudtask/shared';
import { toCamelCase } from '../db/queries';
import { NotFoundError } from '../errors/app-error';

function parseWorkflowRow(row: Record<string, any>): Workflow {
  const base = toCamelCase<Workflow>(row);
  return {
    ...base,
    statuses: typeof row.statuses === 'string' ? JSON.parse(row.statuses) : row.statuses,
    transitions: typeof row.transitions === 'string' ? JSON.parse(row.transitions) : row.transitions,
  };
}

export async function createWorkflow(
  db: D1Database,
  projectId: string,
  data: WorkflowCreate,
): Promise<Workflow> {
  const id = generateId('wfl');
  const now = nowUnix();

  await db.prepare(
    `INSERT INTO workflows (id, project_id, name, statuses, transitions, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    id, projectId, data.name,
    JSON.stringify(data.statuses),
    JSON.stringify(data.transitions),
    now, now,
  ).run();

  return {
    id,
    projectId,
    name: data.name,
    statuses: data.statuses,
    transitions: data.transitions,
    createdAt: now,
    updatedAt: now,
  };
}

export async function getWorkflowById(db: D1Database, id: string): Promise<Workflow | null> {
  const row = await db.prepare('SELECT * FROM workflows WHERE id = ?').bind(id).first();
  if (!row) return null;
  return parseWorkflowRow(row);
}

export async function getWorkflowsByProject(db: D1Database, projectId: string): Promise<Workflow[]> {
  const results = await db.prepare(
    'SELECT * FROM workflows WHERE project_id = ? ORDER BY created_at ASC',
  ).bind(projectId).all();
  return (results.results || []).map(parseWorkflowRow);
}

export async function updateWorkflow(
  db: D1Database,
  id: string,
  data: WorkflowUpdate,
): Promise<Workflow> {
  const now = nowUnix();
  const sets: string[] = ['updated_at = ?'];
  const values: any[] = [now];

  if (data.name !== undefined) {
    sets.push('name = ?');
    values.push(data.name);
  }
  if (data.statuses !== undefined) {
    sets.push('statuses = ?');
    values.push(JSON.stringify(data.statuses));
  }
  if (data.transitions !== undefined) {
    sets.push('transitions = ?');
    values.push(JSON.stringify(data.transitions));
  }

  values.push(id);
  await db.prepare(`UPDATE workflows SET ${sets.join(', ')} WHERE id = ?`).bind(...values).run();

  const row = await db.prepare('SELECT * FROM workflows WHERE id = ?').bind(id).first();
  if (!row) throw new NotFoundError('Workflow not found');
  return parseWorkflowRow(row);
}

export async function deleteWorkflow(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM workflows WHERE id = ?').bind(id).run();
}

export async function validateTransition(
  db: D1Database,
  workflowId: string,
  fromStatus: string,
  toStatus: string,
): Promise<boolean> {
  const workflow = await getWorkflowById(db, workflowId);
  if (!workflow) return false;

  return workflow.transitions.some(
    (t) => t.from === fromStatus && t.to === toStatus,
  );
}
