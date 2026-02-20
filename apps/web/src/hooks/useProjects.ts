import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getProjectsApi, getProjectApi, createProjectApi, updateProjectApi,
  deleteProjectApi, getMembersApi, addMemberApi, removeMemberApi,
} from '../api/projects';

export function useProjects(page = 1) {
  return useQuery({
    queryKey: ['projects', page],
    queryFn: () => getProjectsApi(page),
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => getProjectApi(id),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createProjectApi,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; description?: string; status?: string } }) =>
      updateProjectApi(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['project', id] });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteProjectApi,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}

export function useProjectMembers(projectId: string) {
  return useQuery({
    queryKey: ['project-members', projectId],
    queryFn: () => getMembersApi(projectId),
    enabled: !!projectId,
  });
}

export function useAddMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, userId, role }: { projectId: string; userId: string; role?: string }) =>
      addMemberApi(projectId, userId, role),
    onSuccess: (_, { projectId }) => qc.invalidateQueries({ queryKey: ['project-members', projectId] }),
  });
}

export function useRemoveMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, userId }: { projectId: string; userId: string }) =>
      removeMemberApi(projectId, userId),
    onSuccess: (_, { projectId }) => qc.invalidateQueries({ queryKey: ['project-members', projectId] }),
  });
}
