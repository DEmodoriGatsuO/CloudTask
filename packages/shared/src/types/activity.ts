export type ActivityAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'commented'
  | 'status_changed'
  | 'assigned'
  | 'member_added'
  | 'member_removed';

export interface ActivityLog {
  id: string;
  projectId: string;
  taskId?: string;
  userId: string;
  action: ActivityAction;
  details?: string;
  createdAt: number;
}

export interface ActivityLogWithUser extends ActivityLog {
  user: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
  task?: {
    id: string;
    title: string;
  };
}
