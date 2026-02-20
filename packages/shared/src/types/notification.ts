export type NotificationType = 'mention' | 'assignment' | 'comment' | 'status_change';

export interface Notification {
  id: string;
  userId: string;
  taskId?: string;
  type: NotificationType;
  title: string;
  message?: string;
  isRead: boolean;
  createdAt: number;
}

export interface NotificationWithTask extends Notification {
  task?: {
    id: string;
    title: string;
    projectId: string;
  };
}
