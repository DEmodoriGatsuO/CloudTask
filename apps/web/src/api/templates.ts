import { api } from './client';
import type { ProjectTemplate, ProjectTemplateCreate, ApiResponse } from '@cloudtask/shared';
import type { Project } from '@cloudtask/shared';

export function getTemplatesApi() {
  return api.get<ApiResponse<ProjectTemplate[]>>('/templates');
}

export function getTemplateApi(id: string) {
  return api.get<ApiResponse<ProjectTemplate>>(`/templates/${id}`);
}

export function createTemplateApi(data: ProjectTemplateCreate) {
  return api.post<ApiResponse<ProjectTemplate>>('/templates', data);
}

export function deleteTemplateApi(id: string) {
  return api.del<ApiResponse<{ message: string }>>(`/templates/${id}`);
}

export function createProjectFromTemplateApi(templateId: string) {
  return api.post<ApiResponse<Project>>(`/templates/${templateId}/create-project`);
}
