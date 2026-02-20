import { generateId, nowUnix } from '@cloudtask/shared';
import { toCamelCase } from '../db/queries';
import { NotFoundError } from '../errors/app-error';

export interface AutomationRule {
  id: string;
  projectId: string;
  name: string;
  triggerType: string;
  triggerConfig: Record<string, any>;
  actionType: string;
  actionConfig: Record<string, any>;
  isActive: boolean;
  createdAt: number;
}

interface AutomationRuleCreate {
  name: string;
  triggerType: string;
  triggerConfig: Record<string, any>;
  actionType: string;
  actionConfig: Record<string, any>;
}

interface AutomationRuleUpdate {
  name?: string;
  triggerType?: string;
  triggerConfig?: Record<string, any>;
  actionType?: string;
  actionConfig?: Record<string, any>;
}

function parseRuleRow(row: Record<string, any>): AutomationRule {
  const base = toCamelCase<AutomationRule>(row);
  return {
    ...base,
    triggerConfig: typeof row.trigger_config === 'string' ? JSON.parse(row.trigger_config) : row.trigger_config,
    actionConfig: typeof row.action_config === 'string' ? JSON.parse(row.action_config) : row.action_config,
    isActive: !!(row.is_active),
  };
}

export async function createRule(
  db: D1Database,
  projectId: string,
  data: AutomationRuleCreate,
): Promise<AutomationRule> {
  const id = generateId('aut');
  const now = nowUnix();

  await db.prepare(
    `INSERT INTO automation_rules (id, project_id, name, trigger_type, trigger_config, action_type, action_config, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
  ).bind(
    id, projectId, data.name,
    data.triggerType, JSON.stringify(data.triggerConfig),
    data.actionType, JSON.stringify(data.actionConfig),
    now,
  ).run();

  return {
    id,
    projectId,
    name: data.name,
    triggerType: data.triggerType,
    triggerConfig: data.triggerConfig,
    actionType: data.actionType,
    actionConfig: data.actionConfig,
    isActive: true,
    createdAt: now,
  };
}

export async function getRuleById(db: D1Database, id: string): Promise<AutomationRule | null> {
  const row = await db.prepare('SELECT * FROM automation_rules WHERE id = ?').bind(id).first();
  if (!row) return null;
  return parseRuleRow(row);
}

export async function getRulesByProject(db: D1Database, projectId: string): Promise<AutomationRule[]> {
  const results = await db.prepare(
    'SELECT * FROM automation_rules WHERE project_id = ? ORDER BY created_at ASC',
  ).bind(projectId).all();
  return (results.results || []).map(parseRuleRow);
}

export async function updateRule(
  db: D1Database,
  id: string,
  data: AutomationRuleUpdate,
): Promise<AutomationRule> {
  const sets: string[] = [];
  const values: any[] = [];

  if (data.name !== undefined) {
    sets.push('name = ?');
    values.push(data.name);
  }
  if (data.triggerType !== undefined) {
    sets.push('trigger_type = ?');
    values.push(data.triggerType);
  }
  if (data.triggerConfig !== undefined) {
    sets.push('trigger_config = ?');
    values.push(JSON.stringify(data.triggerConfig));
  }
  if (data.actionType !== undefined) {
    sets.push('action_type = ?');
    values.push(data.actionType);
  }
  if (data.actionConfig !== undefined) {
    sets.push('action_config = ?');
    values.push(JSON.stringify(data.actionConfig));
  }

  if (sets.length > 0) {
    values.push(id);
    await db.prepare(`UPDATE automation_rules SET ${sets.join(', ')} WHERE id = ?`).bind(...values).run();
  }

  const row = await db.prepare('SELECT * FROM automation_rules WHERE id = ?').bind(id).first();
  if (!row) throw new NotFoundError('Automation rule not found');
  return parseRuleRow(row);
}

export async function deleteRule(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM automation_rules WHERE id = ?').bind(id).run();
}

export async function toggleRule(db: D1Database, id: string, isActive: boolean): Promise<void> {
  await db.prepare('UPDATE automation_rules SET is_active = ? WHERE id = ?')
    .bind(isActive ? 1 : 0, id).run();
}

export async function getActiveRulesByTrigger(
  db: D1Database,
  projectId: string,
  triggerType: string,
): Promise<AutomationRule[]> {
  const results = await db.prepare(
    'SELECT * FROM automation_rules WHERE project_id = ? AND trigger_type = ? AND is_active = 1 ORDER BY created_at ASC',
  ).bind(projectId, triggerType).all();
  return (results.results || []).map(parseRuleRow);
}
