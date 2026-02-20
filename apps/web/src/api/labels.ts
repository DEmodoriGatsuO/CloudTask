import { api } from './client';
import type { Label } from '@cloudtask/shared';

export function getLabelsApi(projectId: string) {
  return api.get<{ data: Label[] }>(`/labels?project_id=${projectId}`);
}

export function createLabelApi(data: { projectId: string; name: string; color: string }) {
  return api.post<{ data: Label }>('/labels', data);
}

export function deleteLabelApi(id: string) {
  return api.del<{ data: { message: string } }>(`/labels/${id}`);
}
