import { api } from './client';
import type { Task, TaskWithRelations, PaginatedResponse } from '@cloudtask/shared';

export interface TaskFiltersParam {
  status?: string[];
  priority?: string[];
  assigneeId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  dueFilter?: 'overdue' | 'today' | 'week' | 'none';
}

export function getTasksApi(projectId: string, filters: TaskFiltersParam = {}, page = 1, pageSize = 50) {
  const params = new URLSearchParams({
    project_id: projectId,
    page: String(page),
    pageSize: String(pageSize),
  });
  if (filters.status?.length) params.set('status', filters.status.join(','));
  if (filters.priority?.length) params.set('priority', filters.priority.join(','));
  if (filters.assigneeId) params.set('assignee_id', filters.assigneeId);
  if (filters.search) params.set('search', filters.search);
  if (filters.sortBy) params.set('sort_by', filters.sortBy);
  if (filters.sortOrder) params.set('sort_order', filters.sortOrder);

  const now = Date.now();
  if (filters.dueFilter === 'overdue') {
    params.set('due_before', String(now));
  } else if (filters.dueFilter === 'today') {
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
    params.set('due_after', String(now - 86400000));
    params.set('due_before', String(todayEnd.getTime()));
  } else if (filters.dueFilter === 'week') {
    params.set('due_after', String(now));
    params.set('due_before', String(now + 7 * 86400000));
  }

  return api.get<PaginatedResponse<TaskWithRelations>>(`/tasks?${params}`);
}

export function getTaskApi(id: string) {
  return api.get<{ data: TaskWithRelations }>(`/tasks/${id}`);
}

export function createTaskApi(data: {
  projectId: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  assigneeId?: string;
  dueDate?: number;
  startDate?: number;
  endDate?: number;
}) {
  return api.post<{ data: Task }>('/tasks', data);
}

export function updateTaskApi(id: string, data: Record<string, unknown>) {
  return api.patch<{ data: Task }>(`/tasks/${id}`, data);
}

export function deleteTaskApi(id: string) {
  return api.del<{ data: { message: string } }>(`/tasks/${id}`);
}

export function getSubTasksApi(taskId: string) {
  return api.get<{ data: Task[] }>(`/tasks/${taskId}/subtasks`);
}

export interface BatchFailedItem {
  id: string;
  error: string;
}

export interface BatchUpdateResult {
  succeeded: Task[];
  failed: BatchFailedItem[];
}

export interface BatchDeleteResult {
  succeeded: string[];
  failed: BatchFailedItem[];
}

export function batchUpdateTasksApi(taskIds: string[], data: Record<string, unknown>) {
  return api.post<{ data: BatchUpdateResult }>('/tasks/batch/update', { taskIds, data });
}

export function batchDeleteTasksApi(taskIds: string[]) {
  return api.post<{ data: BatchDeleteResult }>('/tasks/batch/delete', { taskIds });
}

export function addLabelToTaskApi(taskId: string, labelId: string) {
  return api.post<{ data: { message: string } }>(`/tasks/${taskId}/labels/${labelId}`);
}

export function removeLabelFromTaskApi(taskId: string, labelId: string) {
  return api.del<{ data: { message: string } }>(`/tasks/${taskId}/labels/${labelId}`);
}

export interface TaskDependencyRow {
  taskId: string;
  taskTitle: string;
  dependsOnTaskId: string;
  dependsOnTaskTitle: string;
}

export function getTaskDependenciesApi(taskId: string) {
  return api.get<{ data: TaskDependencyRow[] }>(`/tasks/${taskId}/dependencies`);
}

export function getProjectDependenciesApi(projectId: string) {
  return api.get<{ data: TaskDependencyRow[] }>(`/tasks/project-dependencies?project_id=${projectId}`);
}

export function addTaskDependencyApi(taskId: string, dependsOnTaskId: string) {
  return api.post<{ data: { taskId: string; dependsOnTaskId: string } }>(`/tasks/${taskId}/dependencies`, { dependsOnTaskId });
}

export function removeTaskDependencyApi(taskId: string, dependsOnTaskId: string) {
  return api.del<{ data: { message: string } }>(`/tasks/${taskId}/dependencies/${dependsOnTaskId}`);
}
