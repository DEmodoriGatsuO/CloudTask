import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAttachmentsApi, uploadAttachmentApi, deleteAttachmentApi } from '../api/attachments';

export function useAttachments(taskId: string) {
  return useQuery({
    queryKey: ['attachments', taskId],
    queryFn: () => getAttachmentsApi(taskId),
    enabled: !!taskId,
  });
}

export function useUploadAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, file }: { taskId: string; file: File }) =>
      uploadAttachmentApi(taskId, file),
    onSuccess: (_, { taskId }) => {
      qc.invalidateQueries({ queryKey: ['attachments', taskId] });
    },
  });
}

export function useDeleteAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteAttachmentApi,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attachments'] });
    },
  });
}
