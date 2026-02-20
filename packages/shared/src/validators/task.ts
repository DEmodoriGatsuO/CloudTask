import { z } from 'zod';

export const createTaskSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(5000).optional(),
  status: z.enum(['todo', 'in_progress', 'done', 'completed']).default('todo'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  assigneeId: z.string().optional(),
  parentTaskId: z.string().optional(),
  dueDate: z.number().optional(),
  startDate: z.number().optional(),
  endDate: z.number().optional(),
  estimatedHours: z.number().min(0).optional(),
  isMilestone: z.boolean().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  status: z.enum(['todo', 'in_progress', 'done', 'completed']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  assigneeId: z.string().optional().nullable(),
  parentTaskId: z.string().optional().nullable(),
  dueDate: z.number().optional().nullable(),
  startDate: z.number().optional().nullable(),
  endDate: z.number().optional().nullable(),
  actualEndDate: z.number().optional().nullable(),
  estimatedHours: z.number().min(0).optional().nullable(),
  actualHours: z.number().min(0).optional().nullable(),
  sortOrder: z.number().optional(),
  isMilestone: z.boolean().optional(),
  progress: z.number().min(0).max(100).optional(),
});

export const batchUpdateTasksSchema = z.object({
  taskIds: z.array(z.string().min(1)).min(1).max(100),
  data: updateTaskSchema,
});

export const batchDeleteTasksSchema = z.object({
  taskIds: z.array(z.string().min(1)).min(1).max(100),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type BatchUpdateTasksInput = z.infer<typeof batchUpdateTasksSchema>;
export type BatchDeleteTasksInput = z.infer<typeof batchDeleteTasksSchema>;
