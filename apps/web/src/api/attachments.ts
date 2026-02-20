import { api } from './client';
import type { Attachment, AttachmentWithUser, ApiResponse } from '@cloudtask/shared';

const API_HOST = import.meta.env.VITE_API_URL || '';
const BASE_URL = `${API_HOST}/api/v1`;

export function getAttachmentsApi(taskId: string) {
  return api.get<ApiResponse<AttachmentWithUser[]>>(`/tasks/${taskId}/attachments`);
}

export function uploadAttachmentApi(taskId: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return api.upload<ApiResponse<Attachment>>(`/tasks/${taskId}/attachments`, formData);
}

export function deleteAttachmentApi(id: string) {
  return api.del<ApiResponse<{ message: string }>>(`/attachments/${id}`);
}

/** ダウンロード用URL（Content-Disposition: attachment） */
export function getAttachmentDownloadUrl(id: string): string {
  return `${BASE_URL}/attachments/${id}/download`;
}

/** プレビュー用URL（Content-Disposition: inline） */
export function getAttachmentInlineUrl(id: string): string {
  return `${BASE_URL}/attachments/${id}/download?inline=1`;
}
