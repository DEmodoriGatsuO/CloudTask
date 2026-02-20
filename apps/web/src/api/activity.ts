import { api } from './client';
import type { ActivityLogWithUser, PaginatedResponse } from '@cloudtask/shared';

export function getActivityApi(projectId: string, page = 1, pageSize = 20) {
  return api.get<PaginatedResponse<ActivityLogWithUser>>(`/activity?project_id=${projectId}&page=${page}&pageSize=${pageSize}`);
}
