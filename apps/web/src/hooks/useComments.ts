import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCommentsApi, createCommentApi, updateCommentApi, deleteCommentApi } from '../api/comments';

export function useComments(taskId: string) {
  return useQuery({
    queryKey: ['comments', taskId],
    queryFn: () => getCommentsApi(taskId),
    enabled: !!taskId,
  });
}

export function useCreateComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, content }: { taskId: string; content: string }) =>
      createCommentApi(taskId, content),
    onSuccess: (_, { taskId }) => qc.invalidateQueries({ queryKey: ['comments', taskId] }),
  });
}

export function useUpdateComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      updateCommentApi(id, content),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments'] }),
  });
}

export function useDeleteComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteCommentApi,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments'] }),
  });
}
