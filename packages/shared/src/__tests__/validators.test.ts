import { describe, it, expect } from 'vitest';
import { createTaskSchema, updateTaskSchema } from '../validators/task';
import { registerSchema, loginSchema } from '../validators/auth';
import { createLabelSchema } from '../validators/label';

describe('createTaskSchema', () => {
  it('validates valid input', () => {
    const input = { projectId: 'proj_001', title: 'Test Task' };
    const result = createTaskSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('todo');
      expect(result.data.priority).toBe('medium');
    }
  });

  it('validates input with all fields', () => {
    const input = {
      projectId: 'proj_001',
      title: 'Full Task',
      description: 'A description',
      status: 'in_progress',
      priority: 'high',
      assigneeId: 'usr_001',
      parentTaskId: 'task_001',
      dueDate: 1700000000,
      estimatedHours: 8,
    };
    const result = createTaskSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('rejects empty title', () => {
    const input = { projectId: 'proj_001', title: '' };
    const result = createTaskSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects missing projectId', () => {
    const input = { title: 'Test' };
    const result = createTaskSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects title over 200 chars', () => {
    const input = { projectId: 'p1', title: 'a'.repeat(201) };
    const result = createTaskSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects invalid status', () => {
    const input = { projectId: 'p1', title: 'Test', status: 'invalid' };
    const result = createTaskSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects invalid priority', () => {
    const input = { projectId: 'p1', title: 'Test', priority: 'urgent' };
    const result = createTaskSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects negative estimatedHours', () => {
    const input = { projectId: 'p1', title: 'Test', estimatedHours: -1 };
    const result = createTaskSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

describe('updateTaskSchema', () => {
  it('validates empty object (all optional)', () => {
    const result = updateTaskSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('validates partial update', () => {
    const result = updateTaskSchema.safeParse({ status: 'done', priority: 'low' });
    expect(result.success).toBe(true);
  });

  it('accepts nullable fields', () => {
    const result = updateTaskSchema.safeParse({ assigneeId: null, dueDate: null });
    expect(result.success).toBe(true);
  });

  it('validates progress range 0-100', () => {
    expect(updateTaskSchema.safeParse({ progress: 0 }).success).toBe(true);
    expect(updateTaskSchema.safeParse({ progress: 100 }).success).toBe(true);
    expect(updateTaskSchema.safeParse({ progress: 101 }).success).toBe(false);
    expect(updateTaskSchema.safeParse({ progress: -1 }).success).toBe(false);
  });

  it('validates isMilestone boolean', () => {
    expect(updateTaskSchema.safeParse({ isMilestone: true }).success).toBe(true);
    expect(updateTaskSchema.safeParse({ isMilestone: false }).success).toBe(true);
  });
});

describe('registerSchema', () => {
  it('validates valid registration', () => {
    const input = { email: 'test@example.com', password: 'password123', displayName: 'Test User' };
    const result = registerSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('rejects short password', () => {
    const input = { email: 'test@example.com', password: 'short', displayName: 'Test' };
    const result = registerSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const input = { email: 'notanemail', password: 'password123', displayName: 'Test' };
    const result = registerSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('validates valid login', () => {
    const result = loginSchema.safeParse({ email: 'test@example.com', password: 'pass1234' });
    expect(result.success).toBe(true);
  });

  it('rejects missing password', () => {
    const result = loginSchema.safeParse({ email: 'test@example.com' });
    expect(result.success).toBe(false);
  });
});

describe('createLabelSchema', () => {
  it('validates valid label', () => {
    const result = createLabelSchema.safeParse({ projectId: 'p1', name: 'Bug', color: '#ef4444' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid color format', () => {
    const result = createLabelSchema.safeParse({ projectId: 'p1', name: 'Bug', color: 'red' });
    expect(result.success).toBe(false);
  });

  it('rejects long name', () => {
    const result = createLabelSchema.safeParse({ projectId: 'p1', name: 'a'.repeat(51), color: '#000000' });
    expect(result.success).toBe(false);
  });
});
