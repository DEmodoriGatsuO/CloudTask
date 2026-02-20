import { api } from './client';
import type { CustomFieldDefinition, CustomFieldDefinitionCreate, CustomFieldValue, ApiResponse } from '@cloudtask/shared';

export function getCustomFieldsApi(projectId: string) {
  return api.get<ApiResponse<CustomFieldDefinition[]>>(`/projects/${projectId}/custom-fields`);
}

export function createCustomFieldApi(projectId: string, data: CustomFieldDefinitionCreate) {
  return api.post<ApiResponse<CustomFieldDefinition>>(`/projects/${projectId}/custom-fields`, data);
}

export function updateCustomFieldApi(id: string, data: Partial<CustomFieldDefinitionCreate>) {
  return api.patch<ApiResponse<CustomFieldDefinition>>(`/custom-fields/${id}`, data);
}

export function deleteCustomFieldApi(id: string) {
  return api.del<ApiResponse<{ message: string }>>(`/custom-fields/${id}`);
}

export function getCustomFieldValuesApi(taskId: string) {
  return api.get<ApiResponse<CustomFieldValue[]>>(`/tasks/${taskId}/custom-field-values`);
}

export function setCustomFieldValueApi(taskId: string, fieldId: string, value: string) {
  return api.put<ApiResponse<CustomFieldValue>>(`/tasks/${taskId}/custom-field-values/${fieldId}`, { value });
}
