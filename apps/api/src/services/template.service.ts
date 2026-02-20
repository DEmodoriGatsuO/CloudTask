import { generateId, nowUnix } from '@cloudtask/shared';
import type { ProjectTemplate, ProjectTemplateCreate } from '@cloudtask/shared';
import { toCamelCase } from '../db/queries';
import { NotFoundError } from '../errors/app-error';

function parseTemplateRow(row: Record<string, any>): ProjectTemplate {
  const base = toCamelCase<ProjectTemplate>(row);
  return {
    ...base,
    templateData: typeof row.template_data === 'string'
      ? JSON.parse(row.template_data)
      : row.template_data,
  };
}

export async function createTemplate(
  db: D1Database,
  data: ProjectTemplateCreate,
  userId: string,
): Promise<ProjectTemplate> {
  const id = generateId('tpl');
  const now = nowUnix();

  await db.prepare(
    `INSERT INTO project_templates (id, name, description, template_data, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).bind(
    id, data.name, data.description || null,
    JSON.stringify(data.templateData),
    userId, now,
  ).run();

  return {
    id,
    name: data.name,
    description: data.description,
    templateData: data.templateData,
    createdBy: userId,
    createdAt: now,
  };
}

export async function getTemplateById(db: D1Database, id: string): Promise<ProjectTemplate | null> {
  const row = await db.prepare('SELECT * FROM project_templates WHERE id = ?').bind(id).first();
  if (!row) return null;
  return parseTemplateRow(row);
}

export async function getAllTemplates(db: D1Database): Promise<ProjectTemplate[]> {
  const results = await db.prepare(
    'SELECT * FROM project_templates ORDER BY created_at DESC',
  ).all();
  return (results.results || []).map(parseTemplateRow);
}

export async function deleteTemplate(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM project_templates WHERE id = ?').bind(id).run();
}

export async function createProjectFromTemplate(
  db: D1Database,
  templateId: string,
  ownerId: string,
): Promise<string> {
  const template = await getTemplateById(db, templateId);
  if (!template) throw new NotFoundError('Template not found');

  const { templateData } = template;
  const projectId = generateId('prj');
  const now = nowUnix();
  const memberId = generateId('pm');

  const statements: D1PreparedStatement[] = [];

  // Create project
  statements.push(
    db.prepare(
      `INSERT INTO projects (id, name, description, status, owner_id, created_at, updated_at)
       VALUES (?, ?, ?, 'active', ?, ?, ?)`,
    ).bind(
      projectId, templateData.projectName,
      templateData.projectDescription || null,
      ownerId, now, now,
    ),
  );

  // Add owner as project admin
  statements.push(
    db.prepare(
      `INSERT INTO project_members (id, project_id, user_id, role, joined_at)
       VALUES (?, ?, ?, 'project_admin', ?)`,
    ).bind(memberId, projectId, ownerId, now),
  );

  // Create labels
  for (const label of templateData.labels) {
    const labelId = generateId('lbl');
    statements.push(
      db.prepare(
        `INSERT INTO labels (id, project_id, name, color, created_at)
         VALUES (?, ?, ?, ?, ?)`,
      ).bind(labelId, projectId, label.name, label.color, now),
    );
  }

  // Create tasks
  for (let i = 0; i < templateData.tasks.length; i++) {
    const task = templateData.tasks[i];
    const taskId = generateId('tsk');
    statements.push(
      db.prepare(
        `INSERT INTO tasks (id, project_id, title, description, status, priority, reporter_id, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        taskId, projectId, task.title,
        task.description || null,
        task.status || 'todo',
        task.priority || 'medium',
        ownerId, i + 1, now, now,
      ),
    );
  }

  await db.batch(statements);

  return projectId;
}
