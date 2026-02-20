import { describe, it, expect } from 'vitest';
import { toCamelCase, toSnakeCase, rowsToCamelCase, buildSetClause } from '../../db/queries';

describe('toCamelCase', () => {
  it('converts snake_case keys to camelCase', () => {
    const row = { project_id: 'p1', created_at: 1000, display_name: 'Test' };
    const result = toCamelCase<{ projectId: string; createdAt: number; displayName: string }>(row);
    expect(result).toEqual({ projectId: 'p1', createdAt: 1000, displayName: 'Test' });
  });

  it('leaves already camelCase keys unchanged', () => {
    const row = { id: '1', name: 'test' };
    const result = toCamelCase<{ id: string; name: string }>(row);
    expect(result).toEqual({ id: '1', name: 'test' });
  });

  it('handles empty object', () => {
    expect(toCamelCase({})).toEqual({});
  });

  it('handles multiple underscores', () => {
    const row = { is_due_date_set: true };
    const result = toCamelCase<{ isDueDateSet: boolean }>(row);
    expect(result).toEqual({ isDueDateSet: true });
  });

  it('preserves null and undefined values', () => {
    const row = { assignee_id: null, due_date: undefined };
    const result = toCamelCase<{ assigneeId: null; dueDate: undefined }>(row);
    expect(result).toEqual({ assigneeId: null, dueDate: undefined });
  });
});

describe('toSnakeCase', () => {
  it('converts camelCase keys to snake_case', () => {
    const obj = { projectId: 'p1', createdAt: 1000, displayName: 'Test' };
    const result = toSnakeCase(obj);
    expect(result).toEqual({ project_id: 'p1', created_at: 1000, display_name: 'Test' });
  });

  it('leaves already snake_case keys unchanged', () => {
    const obj = { id: '1', name: 'test' };
    const result = toSnakeCase(obj);
    expect(result).toEqual({ id: '1', name: 'test' });
  });

  it('handles empty object', () => {
    expect(toSnakeCase({})).toEqual({});
  });
});

describe('rowsToCamelCase', () => {
  it('converts array of rows', () => {
    const rows = [
      { project_id: 'p1', task_id: 't1' },
      { project_id: 'p2', task_id: 't2' },
    ];
    const result = rowsToCamelCase<{ projectId: string; taskId: string }>(rows);
    expect(result).toEqual([
      { projectId: 'p1', taskId: 't1' },
      { projectId: 'p2', taskId: 't2' },
    ]);
  });

  it('returns empty array for empty input', () => {
    expect(rowsToCamelCase([])).toEqual([]);
  });
});

describe('buildSetClause', () => {
  it('builds SET clause from camelCase data', () => {
    const data = { title: 'New Title', status: 'done' };
    const { clause, values } = buildSetClause(data);
    expect(clause).toBe('title = ?, status = ?');
    expect(values).toEqual(['New Title', 'done']);
  });

  it('converts camelCase keys to snake_case', () => {
    const data = { displayName: 'Test', avatarUrl: 'http://example.com' };
    const { clause, values } = buildSetClause(data);
    expect(clause).toBe('display_name = ?, avatar_url = ?');
    expect(values).toEqual(['Test', 'http://example.com']);
  });

  it('skips undefined values', () => {
    const data = { title: 'Updated', description: undefined, status: 'done' };
    const { clause, values } = buildSetClause(data);
    expect(clause).toBe('title = ?, status = ?');
    expect(values).toEqual(['Updated', 'done']);
  });

  it('includes null values', () => {
    const data = { assigneeId: null };
    const { clause, values } = buildSetClause(data);
    expect(clause).toBe('assignee_id = ?');
    expect(values).toEqual([null]);
  });
});
