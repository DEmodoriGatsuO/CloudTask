import { api } from './client';
import type { CommentWithUser, PaginatedResponse } from '@cloudtask/shared';

export function getCommentsApi(taskId: string, page = 1, pageSize = 50) {
  return api.get<PaginatedResponse<CommentWithUser>>(`/comments/tasks/${taskId}/comments?page=${page}&pageSize=${pageSize}`);
}

export function createCommentApi(taskId: string, content: string) {
  return api.post<{ data: CommentWithUser }>(`/comments/tasks/${taskId}/comments`, { content });
}

export function updateCommentApi(id: string, content: string) {
  return api.patch<{ data: { message: string } }>(`/comments/${id}`, { content });
}

export function deleteCommentApi(id: string) {
  return api.del<{ data: { message: string } }>(`/comments/${id}`);
}
