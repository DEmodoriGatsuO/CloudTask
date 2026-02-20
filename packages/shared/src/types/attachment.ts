export interface Attachment {
  id: string;
  taskId?: string;
  commentId?: string;
  userId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  r2Key: string;
  createdAt: number;
}

export interface AttachmentWithUser extends Attachment {
  user: {
    id: string;
    displayName: string;
  };
}
