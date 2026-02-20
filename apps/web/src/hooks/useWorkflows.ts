import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getWorkflowsApi,
  getWorkflowApi,
  createWorkflowApi,
  updateWorkflowApi,
  deleteWorkflowApi,
} from '../api/workflows';
import type { WorkflowCreate, WorkflowUpdate } from '@cloudtask/shared';

export function useWorkflows(projectId: string) {
  return useQuery({
    queryKey: ['workflows', projectId],
    queryFn: () => getWorkflowsApi(projectId),
    enabled: !!projectId,
  });
}

export function useWorkflow(id: string) {
  return useQuery({
    queryKey: ['workflow', id],
    queryFn: () => getWorkflowApi(id),
    enabled: !!id,
  });
}

export function useCreateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: WorkflowCreate }) =>
      createWorkflowApi(projectId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
}

export function useUpdateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: WorkflowUpdate }) =>
      updateWorkflowApi(id, data),
    onSuccess: (_res, variables) => {
      qc.invalidateQueries({ queryKey: ['workflows'] });
      qc.invalidateQueries({ queryKey: ['workflow', variables.id] });
    },
  });
}

export function useDeleteWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteWorkflowApi,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
}
