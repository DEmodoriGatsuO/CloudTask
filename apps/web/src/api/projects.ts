import { api } from './client';
import type { Project, ProjectWithStats, ProjectMemberWithUser, PaginatedResponse } from '@cloudtask/shared';

export function getProjectsApi(page = 1, pageSize = 20) {
  return api.get<PaginatedResponse<ProjectWithStats>>(`/projects?page=${page}&pageSize=${pageSize}`);
}

export function getProjectApi(id: string) {
  return api.get<{ data: ProjectWithStats }>(`/projects/${id}`);
}

export function createProjectApi(data: { name: string; description?: string }) {
  return api.post<{ data: Project }>('/projects', data);
}

export function updateProjectApi(id: string, data: { name?: string; description?: string; status?: string }) {
  return api.patch<{ data: Project }>(`/projects/${id}`, data);
}

export function deleteProjectApi(id: string) {
  return api.del<{ data: { message: string } }>(`/projects/${id}`);
}

export function getMembersApi(projectId: string) {
  return api.get<{ data: ProjectMemberWithUser[] }>(`/projects/${projectId}/members`);
}

export function addMemberApi(projectId: string, userId: string, role = 'member') {
  return api.post<{ data: { message: string } }>(`/projects/${projectId}/members`, { userId, role });
}

export function removeMemberApi(projectId: string, userId: string) {
  return api.del<{ data: { message: string } }>(`/projects/${projectId}/members/${userId}`);
}
