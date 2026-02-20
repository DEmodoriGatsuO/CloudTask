import { generateId, nowUnix } from '@cloudtask/shared';
import type { User } from '@cloudtask/shared';
import { toCamelCase } from '../db/queries';
import { ConflictError, NotFoundError } from '../errors/app-error';
import { hashPassword } from './auth.service';

export async function createUser(
  db: D1Database,
  data: { email: string; password: string; displayName: string },
): Promise<User> {
  const existing = await db.prepare('SELECT id FROM users WHERE email = ?').bind(data.email).first();
  if (existing) throw new ConflictError('Email already registered');

  const id = generateId('usr');
  const now = nowUnix();
  const passwordHash = await hashPassword(data.password);

  await db.prepare(
    `INSERT INTO users (id, email, password_hash, display_name, role, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'member', ?, ?)`,
  ).bind(id, data.email, passwordHash, data.displayName, now, now).run();

  return { id, email: data.email, displayName: data.displayName, role: 'member', createdAt: now, updatedAt: now };
}

export async function getUserById(db: D1Database, id: string): Promise<User | null> {
  const row = await db.prepare(
    'SELECT id, email, display_name, avatar_url, role, created_at, updated_at FROM users WHERE id = ?',
  ).bind(id).first();
  return row ? toCamelCase<User>(row) : null;
}

export async function getUserByEmail(db: D1Database, email: string) {
  const row = await db.prepare(
    'SELECT id, email, password_hash, display_name, avatar_url, role, created_at, updated_at FROM users WHERE email = ?',
  ).bind(email).first();
  return row ? toCamelCase<any>(row) : null;
}

export async function updateUser(
  db: D1Database,
  id: string,
  data: { displayName?: string; avatarUrl?: string },
): Promise<User> {
  const now = nowUnix();
  const sets: string[] = ['updated_at = ?'];
  const values: any[] = [now];

  if (data.displayName !== undefined) {
    sets.push('display_name = ?');
    values.push(data.displayName);
  }
  if (data.avatarUrl !== undefined) {
    sets.push('avatar_url = ?');
    values.push(data.avatarUrl);
  }

  values.push(id);
  await db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).bind(...values).run();

  const user = await getUserById(db, id);
  if (!user) throw new NotFoundError('User not found');
  return user;
}

export async function searchUsers(db: D1Database, query: string): Promise<User[]> {
  const results = await db.prepare(
    `SELECT id, email, display_name, avatar_url, role, created_at, updated_at
     FROM users WHERE display_name LIKE ? OR email LIKE ? LIMIT 20`,
  ).bind(`%${query}%`, `%${query}%`).all();
  return (results.results || []).map((r) => toCamelCase<User>(r));
}
