import { api } from './client';
import type {
  WikiPage,
  WikiPageCreate,
  WikiPageUpdate,
  WikiPageWithMeta,
  WikiPageVersion,
  ApiResponse,
  PaginatedResponse,
} from '@cloudtask/shared';

export function getWikiPagesApi(projectId: string, page = 1) {
  return api.get<PaginatedResponse<WikiPage>>(`/projects/${projectId}/wiki?page=${page}`);
}

export function getWikiPageApi(id: string) {
  return api.get<ApiResponse<WikiPageWithMeta>>(`/wiki/${id}`);
}

export function createWikiPageApi(projectId: string, data: WikiPageCreate) {
  return api.post<ApiResponse<WikiPage>>(`/projects/${projectId}/wiki`, data);
}

export function updateWikiPageApi(id: string, data: WikiPageUpdate) {
  return api.patch<ApiResponse<WikiPage>>(`/wiki/${id}`, data);
}

export function deleteWikiPageApi(id: string) {
  return api.del<ApiResponse<{ message: string }>>(`/wiki/${id}`);
}

export function getWikiPageVersionsApi(pageId: string) {
  return api.get<ApiResponse<WikiPageVersion[]>>(`/wiki/${pageId}/versions`);
}

export function searchWikiPagesApi(projectId: string, query: string) {
  return api.get<ApiResponse<WikiPage[]>>(`/projects/${projectId}/wiki/search?q=${encodeURIComponent(query)}`);
}
