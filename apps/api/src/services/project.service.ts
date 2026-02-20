import { generateId, nowUnix } from '@cloudtask/shared';
import type { Project, ProjectWithStats, ProjectMember, ProjectMemberWithUser } from '@cloudtask/shared';
import { toCamelCase, rowsToCamelCase } from '../db/queries';
import { NotFoundError, ConflictError } from '../errors/app-error';
import type { PaginationParams } from '@cloudtask/shared';
import { getOffset, createPaginatedResult } from '@cloudtask/shared';

export async function createProject(
  db: D1Database,
  data: { name: string; description?: string },
  ownerId: string,
): Promise<Project> {
  const id = generateId('prj');
  const now = nowUnix();
  const memberId = generateId('pm');

  const batch = [
    db.prepare(
      `INSERT INTO projects (id, name, description, status, owner_id, created_at, updated_at)
       VALUES (?, ?, ?, 'active', ?, ?, ?)`,
    ).bind(id, data.name, data.description || null, ownerId, now, now),
    db.prepare(
      `INSERT INTO project_members (id, project_id, user_id, role, joined_at)
       VALUES (?, ?, ?, 'project_admin', ?)`,
    ).bind(memberId, id, ownerId, now),
  ];

  await db.batch(batch);

  return { id, name: data.name, description: data.description, status: 'active', ownerId, createdAt: now, updatedAt: now };
}

export async function getProjectById(db: D1Database, id: string): Promise<ProjectWithStats | null> {
  const row = await db.prepare(
    `SELECT p.*,
       (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count,
       (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count
     FROM projects p WHERE p.id = ?`,
  ).bind(id).first();
  return row ? toCamelCase<ProjectWithStats>(row) : null;
}

export async function getProjectsByUserId(
  db: D1Database,
  userId: string,
  pagination: PaginationParams,
) {
  const offset = getOffset(pagination);
  const countResult = await db.prepare(
    `SELECT COUNT(*) as total FROM projects p
     INNER JOIN project_members pm ON pm.project_id = p.id
     WHERE pm.user_id = ? AND p.status = 'active'`,
  ).bind(userId).first<{ total: number }>();

  const total = countResult?.total || 0;

  const results = await db.prepare(
    `SELECT p.*,
       (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count,
       (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count
     FROM projects p
     INNER JOIN project_members pm ON pm.project_id = p.id
     WHERE pm.user_id = ? AND p.status = 'active'
     ORDER BY p.updated_at DESC
     LIMIT ? OFFSET ?`,
  ).bind(userId, pagination.pageSize, offset).all();

  const data = rowsToCamelCase<ProjectWithStats>(results.results || []);
  return createPaginatedResult(data, total, pagination);
}

export async function updateProject(
  db: D1Database,
  id: string,
  data: { name?: string; description?: string; status?: string },
): Promise<Project> {
  const now = nowUnix();
  const sets: string[] = ['updated_at = ?'];
  const values: unknown[] = [now];

  if (data.name !== undefined) { sets.push('name = ?'); values.push(data.name); }
  if (data.description !== undefined) { sets.push('description = ?'); values.push(data.description); }
  if (data.status !== undefined) { sets.push('status = ?'); values.push(data.status); }

  values.push(id);
  await db.prepare(`UPDATE projects SET ${sets.join(', ')} WHERE id = ?`).bind(...values).run();

  const project = await db.prepare('SELECT * FROM projects WHERE id = ?').bind(id).first();
  if (!project) throw new NotFoundError('Project not found');
  return toCamelCase<Project>(project);
}

export async function deleteProject(db: D1Database, id: string): Promise<void> {
  await db.prepare("UPDATE projects SET status = 'archived', updated_at = ? WHERE id = ?")
    .bind(nowUnix(), id).run();
}

export async function addMember(
  db: D1Database,
  projectId: string,
  userId: string,
  role: string = 'member',
): Promise<void> {
  const existing = await db.prepare(
    'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?',
  ).bind(projectId, userId).first();
  if (existing) throw new ConflictError('User is already a member');

  const id = generateId('pm');
  await db.prepare(
    `INSERT INTO project_members (id, project_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)`,
  ).bind(id, projectId, userId, role, nowUnix()).run();
}

export async function removeMember(db: D1Database, projectId: string, userId: string): Promise<void> {
  await db.prepare('DELETE FROM project_members WHERE project_id = ? AND user_id = ?')
    .bind(projectId, userId).run();
}

export async function getMembers(db: D1Database, projectId: string): Promise<ProjectMemberWithUser[]> {
  const results = await db.prepare(
    `SELECT pm.id, pm.project_id, pm.user_id, pm.role, pm.joined_at,
       u.email, u.display_name, u.avatar_url
     FROM project_members pm
     INNER JOIN users u ON u.id = pm.user_id
     WHERE pm.project_id = ?
     ORDER BY pm.joined_at ASC`,
  ).bind(projectId).all();

  return (results.results || []).map((r) => ({
    id: r.id as string,
    projectId: r.project_id as string,
    userId: r.user_id as string,
    role: r.role as ProjectMember['role'],
    joinedAt: r.joined_at as number,
    user: {
      id: r.user_id as string,
      email: r.email as string,
      displayName: r.display_name as string,
      avatarUrl: r.avatar_url as string | undefined,
    },
  }));
}

export async function getMemberRole(db: D1Database, projectId: string, userId: string): Promise<string | null> {
  const row = await db.prepare(
    'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?',
  ).bind(projectId, userId).first<{ role: string }>();
  return row?.role || null;
}
