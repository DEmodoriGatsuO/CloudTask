import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getWikiPagesApi,
  getWikiPageApi,
  createWikiPageApi,
  updateWikiPageApi,
  deleteWikiPageApi,
  getWikiPageVersionsApi,
  searchWikiPagesApi,
} from '../api/wiki';
import type { WikiPageCreate, WikiPageUpdate } from '@cloudtask/shared';

export function useWikiPages(projectId: string) {
  return useQuery({
    queryKey: ['wiki', projectId],
    queryFn: () => getWikiPagesApi(projectId),
    enabled: !!projectId,
  });
}

export function useWikiPage(id: string) {
  return useQuery({
    queryKey: ['wikiPage', id],
    queryFn: () => getWikiPageApi(id),
    enabled: !!id,
  });
}

export function useCreateWikiPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: WikiPageCreate }) =>
      createWikiPageApi(projectId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wiki'] });
    },
  });
}

export function useUpdateWikiPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: WikiPageUpdate }) =>
      updateWikiPageApi(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['wiki'] });
      qc.invalidateQueries({ queryKey: ['wikiPage', id] });
    },
  });
}

export function useDeleteWikiPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteWikiPageApi,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wiki'] });
    },
  });
}

export function useWikiPageVersions(pageId: string) {
  return useQuery({
    queryKey: ['wikiVersions', pageId],
    queryFn: () => getWikiPageVersionsApi(pageId),
    enabled: !!pageId,
  });
}

export function useSearchWikiPages(projectId: string, query: string) {
  return useQuery({
    queryKey: ['wikiSearch', projectId, query],
    queryFn: () => searchWikiPagesApi(projectId, query),
    enabled: !!projectId && query.length >= 2,
  });
}
