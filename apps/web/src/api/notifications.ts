import { api } from './client';
import type { NotificationWithTask, PaginatedResponse } from '@cloudtask/shared';

export function getNotificationsApi(page = 1, pageSize = 20) {
  return api.get<PaginatedResponse<NotificationWithTask>>(`/notifications?page=${page}&pageSize=${pageSize}`);
}

export function getUnreadCountApi() {
  return api.get<{ data: { count: number } }>('/notifications/unread-count');
}

export function markAsReadApi(id: string) {
  return api.patch<{ data: { message: string } }>(`/notifications/${id}/read`, {});
}

export function markAllAsReadApi() {
  return api.post<{ data: { message: string } }>('/notifications/mark-all-read');
}
