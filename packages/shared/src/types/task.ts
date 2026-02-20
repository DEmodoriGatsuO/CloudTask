export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string;
  reporterId: string;
  parentTaskId?: string;
  dueDate?: number;
  startDate?: number;
  endDate?: number;
  actualEndDate?: number;
  estimatedHours?: number;
  actualHours?: number;
  sortOrder: number;
  isMilestone: boolean;
  progress: number;
  createdAt: number;
  updatedAt: number;
}

export interface TaskCreate {
  projectId: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  parentTaskId?: string;
  dueDate?: number;
  startDate?: number;
  endDate?: number;
  estimatedHours?: number;
}

export interface TaskUpdate {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string | null;
  parentTaskId?: string | null;
  dueDate?: number | null;
  startDate?: number | null;
  endDate?: number | null;
  actualEndDate?: number | null;
  estimatedHours?: number | null;
  actualHours?: number | null;
  sortOrder?: number;
  isMilestone?: boolean;
  progress?: number;
}

export interface TaskWithRelations extends Task {
  assignee?: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
  reporter: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
  labels: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  subTaskCount: number;
  commentCount: number;
}

export interface TaskDependency {
  taskId: string;
  dependsOnTaskId: string;
}

export interface TaskFilters {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  assigneeId?: string;
  labelId?: string;
  search?: string;
  dueBefore?: number;
  dueAfter?: number;
}
