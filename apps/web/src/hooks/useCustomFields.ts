import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCustomFieldsApi,
  createCustomFieldApi,
  updateCustomFieldApi,
  deleteCustomFieldApi,
  getCustomFieldValuesApi,
  setCustomFieldValueApi,
} from '../api/custom-fields';
import type { CustomFieldDefinitionCreate } from '@cloudtask/shared';

export function useCustomFields(projectId: string) {
  return useQuery({
    queryKey: ['customFields', projectId],
    queryFn: () => getCustomFieldsApi(projectId),
    enabled: !!projectId,
  });
}

export function useCreateCustomField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: CustomFieldDefinitionCreate }) =>
      createCustomFieldApi(projectId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customFields'] });
    },
  });
}

export function useUpdateCustomField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CustomFieldDefinitionCreate> }) =>
      updateCustomFieldApi(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customFields'] });
    },
  });
}

export function useDeleteCustomField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteCustomFieldApi,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customFields'] });
    },
  });
}

export function useCustomFieldValues(taskId: string) {
  return useQuery({
    queryKey: ['customFieldValues', taskId],
    queryFn: () => getCustomFieldValuesApi(taskId),
    enabled: !!taskId,
  });
}

export function useSetCustomFieldValue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, fieldId, value }: { taskId: string; fieldId: string; value: string }) =>
      setCustomFieldValueApi(taskId, fieldId, value),
    onSuccess: (_res, variables) => {
      qc.invalidateQueries({ queryKey: ['customFieldValues', variables.taskId] });
    },
  });
}
