import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTemplatesApi,
  getTemplateApi,
  createTemplateApi,
  deleteTemplateApi,
  createProjectFromTemplateApi,
} from '../api/templates';
import type { ProjectTemplateCreate } from '@cloudtask/shared';

export function useTemplates() {
  return useQuery({
    queryKey: ['templates'],
    queryFn: getTemplatesApi,
  });
}

export function useTemplate(id: string) {
  return useQuery({
    queryKey: ['template', id],
    queryFn: () => getTemplateApi(id),
    enabled: !!id,
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ProjectTemplateCreate) => createTemplateApi(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteTemplateApi,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}

export function useCreateProjectFromTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (templateId: string) => createProjectFromTemplateApi(templateId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}
