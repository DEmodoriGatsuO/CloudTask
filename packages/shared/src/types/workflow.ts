export interface WorkflowStatus {
  id: string;
  name: string;
  color: string;
}

export interface WorkflowTransition {
  from: string;
  to: string;
}

export interface Workflow {
  id: string;
  projectId: string;
  name: string;
  statuses: WorkflowStatus[];
  transitions: WorkflowTransition[];
  createdAt: number;
  updatedAt: number;
}

export interface WorkflowCreate {
  name: string;
  statuses: WorkflowStatus[];
  transitions: WorkflowTransition[];
}

export interface WorkflowUpdate {
  name?: string;
  statuses?: WorkflowStatus[];
  transitions?: WorkflowTransition[];
}
