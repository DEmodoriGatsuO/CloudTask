export interface Comment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface CommentCreate {
  content: string;
}

export interface CommentUpdate {
  content: string;
}

export interface CommentWithUser extends Comment {
  user: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
}
