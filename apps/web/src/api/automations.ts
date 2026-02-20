import { api } from './client';
import type { ApiResponse } from '@cloudtask/shared';

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

export function getAutomationsApi(projectId: string) {
  return api.get<ApiResponse<AutomationRule[]>>(`/projects/${projectId}/automations`);
}

export function getAutomationApi(id: string) {
  return api.get<ApiResponse<AutomationRule>>(`/automations/${id}`);
}

export function createAutomationApi(projectId: string, data: any) {
  return api.post<ApiResponse<AutomationRule>>(`/projects/${projectId}/automations`, data);
}

export function updateAutomationApi(id: string, data: any) {
  return api.patch<ApiResponse<AutomationRule>>(`/automations/${id}`, data);
}

export function deleteAutomationApi(id: string) {
  return api.del<ApiResponse<{ message: string }>>(`/automations/${id}`);
}

export function toggleAutomationApi(id: string, isActive: boolean) {
  return api.post<ApiResponse<AutomationRule>>(`/automations/${id}/toggle`, { isActive });
}
