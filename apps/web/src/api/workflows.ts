import { api } from './client';
import type { Workflow, WorkflowCreate, WorkflowUpdate, ApiResponse } from '@cloudtask/shared';

export function getWorkflowsApi(projectId: string) {
  return api.get<ApiResponse<Workflow[]>>(`/projects/${projectId}/workflows`);
}

export function getWorkflowApi(id: string) {
  return api.get<ApiResponse<Workflow>>(`/workflows/${id}`);
}

export function createWorkflowApi(projectId: string, data: WorkflowCreate) {
  return api.post<ApiResponse<Workflow>>(`/projects/${projectId}/workflows`, data);
}

export function updateWorkflowApi(id: string, data: WorkflowUpdate) {
  return api.patch<ApiResponse<Workflow>>(`/workflows/${id}`, data);
}

export function deleteWorkflowApi(id: string) {
  return api.del<ApiResponse<{ message: string }>>(`/workflows/${id}`);
}

export function validateTransitionApi(workflowId: string, from: string, to: string) {
  return api.post<ApiResponse<{ valid: boolean }>>(`/workflows/${workflowId}/validate`, { from, to });
}
