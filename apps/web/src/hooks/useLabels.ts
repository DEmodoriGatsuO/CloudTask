import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getLabelsApi, createLabelApi, deleteLabelApi } from '../api/labels';

export function useLabels(projectId: string) {
  return useQuery({
    queryKey: ['labels', projectId],
    queryFn: () => getLabelsApi(projectId),
    enabled: !!projectId,
  });
}

export function useCreateLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createLabelApi,
    onSuccess: (res) => qc.invalidateQueries({ queryKey: ['labels', res.data.projectId] }),
  });
}

export function useDeleteLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteLabelApi,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['labels'] }),
  });
}
