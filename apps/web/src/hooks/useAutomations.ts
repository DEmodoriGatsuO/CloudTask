import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAutomationsApi,
  createAutomationApi,
  updateAutomationApi,
  deleteAutomationApi,
  toggleAutomationApi,
} from '../api/automations';

export function useAutomations(projectId: string) {
  return useQuery({
    queryKey: ['automations', projectId],
    queryFn: () => getAutomationsApi(projectId),
    enabled: !!projectId,
  });
}

export function useCreateAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: any }) =>
      createAutomationApi(projectId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['automations'] });
    },
  });
}

export function useUpdateAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      updateAutomationApi(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['automations'] });
    },
  });
}

export function useDeleteAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteAutomationApi,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['automations'] });
    },
  });
}

export function useToggleAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      toggleAutomationApi(id, isActive),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['automations'] });
    },
  });
}
