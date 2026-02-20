import { generateId, nowUnix } from '@cloudtask/shared';
import type { WikiPage, WikiPageCreate, WikiPageUpdate, WikiPageVersion, WikiPageWithMeta } from '@cloudtask/shared';
import { toCamelCase, rowsToCamelCase } from '../db/queries';
import { NotFoundError } from '../errors/app-error';
import type { PaginationParams } from '@cloudtask/shared';
import { getOffset, createPaginatedResult } from '@cloudtask/shared';

export async function createWikiPage(
  db: D1Database,
  projectId: string,
  data: WikiPageCreate,
  userId: string,
): Promise<WikiPage> {
  const id = generateId('wiki');
  const now = nowUnix();

  await db.prepare(
    `INSERT INTO wiki_pages (id, project_id, title, content, parent_page_id, created_by, updated_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    id, projectId, data.title, data.content,
    data.parentPageId || null, userId, userId, now, now,
  ).run();

  // Create initial version
  const versionId = generateId('wv');
  await db.prepare(
    `INSERT INTO wiki_page_versions (id, page_id, content, edited_by, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).bind(versionId, id, data.content, userId, now).run();

  const row = await db.prepare('SELECT * FROM wiki_pages WHERE id = ?').bind(id).first();
  return toCamelCase<WikiPage>(row!);
}

export async function getWikiPageById(
  db: D1Database,
  id: string,
): Promise<WikiPageWithMeta | null> {
  const row = await db.prepare('SELECT * FROM wiki_pages WHERE id = ?').bind(id).first();
  if (!row) return null;

  const page = toCamelCase<WikiPage>(row);

  // Get created by user
  const createdByRow = await db.prepare('SELECT id, display_name FROM users WHERE id = ?')
    .bind(page.createdBy).first();
  const createdByUser = createdByRow
    ? { id: createdByRow.id as string, displayName: createdByRow.display_name as string }
    : { id: page.createdBy, displayName: 'Unknown' };

  // Get updated by user
  let updatedByUser = createdByUser;
  if (page.updatedBy !== page.createdBy) {
    const updatedByRow = await db.prepare('SELECT id, display_name FROM users WHERE id = ?')
      .bind(page.updatedBy).first();
    updatedByUser = updatedByRow
      ? { id: updatedByRow.id as string, displayName: updatedByRow.display_name as string }
      : { id: page.updatedBy, displayName: 'Unknown' };
  }

  // Get children pages
  const childrenResult = await db.prepare(
    'SELECT id, title FROM wiki_pages WHERE parent_page_id = ? ORDER BY title ASC',
  ).bind(id).all();
  const children = (childrenResult.results || []).map((c) => ({
    id: c.id as string,
    title: c.title as string,
  }));

  return {
    ...page,
    createdByUser,
    updatedByUser,
    children,
  };
}

export async function getWikiPagesByProject(
  db: D1Database,
  projectId: string,
  pagination: PaginationParams,
) {
  const countResult = await db.prepare('SELECT COUNT(*) as total FROM wiki_pages WHERE project_id = ?')
    .bind(projectId).first<{ total: number }>();
  const total = countResult?.total || 0;

  const offset = getOffset(pagination);
  const results = await db.prepare(
    `SELECT wp.*, u.display_name as updated_by_name
     FROM wiki_pages wp
     INNER JOIN users u ON u.id = wp.updated_by
     WHERE wp.project_id = ?
     ORDER BY wp.updated_at DESC
     LIMIT ? OFFSET ?`,
  ).bind(projectId, pagination.pageSize, offset).all();

  const data = (results.results || []).map((r) => ({
    ...toCamelCase<WikiPage>(r),
    updatedByUser: {
      id: r.updated_by as string,
      displayName: r.updated_by_name as string,
    },
  }));

  return createPaginatedResult(data, total, pagination);
}

export async function updateWikiPage(
  db: D1Database,
  id: string,
  data: WikiPageUpdate,
  userId: string,
): Promise<WikiPage> {
  const existing = await db.prepare('SELECT * FROM wiki_pages WHERE id = ?').bind(id).first();
  if (!existing) throw new NotFoundError('Wiki page not found');

  // Save the old content as a version before updating
  if (data.content !== undefined && data.content !== existing.content) {
    const versionId = generateId('wv');
    await db.prepare(
      `INSERT INTO wiki_page_versions (id, page_id, content, edited_by, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).bind(versionId, id, existing.content as string, existing.updated_by as string, existing.updated_at as number).run();
  }

  const now = nowUnix();
  const sets: string[] = ['updated_by = ?', 'updated_at = ?'];
  const values: any[] = [userId, now];

  if (data.title !== undefined) {
    sets.push('title = ?');
    values.push(data.title);
  }
  if (data.content !== undefined) {
    sets.push('content = ?');
    values.push(data.content);
  }
  if (data.parentPageId !== undefined) {
    sets.push('parent_page_id = ?');
    values.push(data.parentPageId === null ? null : data.parentPageId);
  }

  values.push(id);
  await db.prepare(`UPDATE wiki_pages SET ${sets.join(', ')} WHERE id = ?`).bind(...values).run();

  const updated = await db.prepare('SELECT * FROM wiki_pages WHERE id = ?').bind(id).first();
  return toCamelCase<WikiPage>(updated!);
}

export async function deleteWikiPage(db: D1Database, id: string): Promise<void> {
  const existing = await db.prepare('SELECT id FROM wiki_pages WHERE id = ?').bind(id).first();
  if (!existing) throw new NotFoundError('Wiki page not found');

  // Unlink children by setting their parent_page_id to null
  await db.prepare('UPDATE wiki_pages SET parent_page_id = NULL WHERE parent_page_id = ?').bind(id).run();

  // Delete versions
  await db.prepare('DELETE FROM wiki_page_versions WHERE page_id = ?').bind(id).run();

  // Delete page
  await db.prepare('DELETE FROM wiki_pages WHERE id = ?').bind(id).run();
}

export async function getWikiPageVersions(
  db: D1Database,
  pageId: string,
  pagination: PaginationParams,
) {
  const countResult = await db.prepare('SELECT COUNT(*) as total FROM wiki_page_versions WHERE page_id = ?')
    .bind(pageId).first<{ total: number }>();
  const total = countResult?.total || 0;

  const offset = getOffset(pagination);
  const results = await db.prepare(
    `SELECT v.*, u.display_name as edited_by_name
     FROM wiki_page_versions v
     INNER JOIN users u ON u.id = v.edited_by
     WHERE v.page_id = ?
     ORDER BY v.created_at DESC
     LIMIT ? OFFSET ?`,
  ).bind(pageId, pagination.pageSize, offset).all();

  const data = (results.results || []).map((r) => ({
    ...toCamelCase<WikiPageVersion>(r),
    editedByUser: {
      id: r.edited_by as string,
      displayName: r.edited_by_name as string,
    },
  }));

  return createPaginatedResult(data, total, pagination);
}

export async function searchWikiPages(
  db: D1Database,
  projectId: string,
  query: string,
) {
  const searchTerm = `%${query}%`;
  const results = await db.prepare(
    `SELECT wp.id, wp.title, wp.project_id, wp.parent_page_id, wp.updated_at,
            u.display_name as updated_by_name, u.id as updated_by_id
     FROM wiki_pages wp
     INNER JOIN users u ON u.id = wp.updated_by
     WHERE wp.project_id = ? AND (wp.title LIKE ? OR wp.content LIKE ?)
     ORDER BY wp.updated_at DESC
     LIMIT 50`,
  ).bind(projectId, searchTerm, searchTerm).all();

  return (results.results || []).map((r) => ({
    id: r.id as string,
    title: r.title as string,
    projectId: r.project_id as string,
    parentPageId: r.parent_page_id as string | undefined,
    updatedAt: r.updated_at as number,
    updatedByUser: {
      id: r.updated_by_id as string,
      displayName: r.updated_by_name as string,
    },
  }));
}
