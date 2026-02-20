export interface Label {
  id: string;
  projectId: string;
  name: string;
  color: string;
  createdAt: number;
}

export interface LabelCreate {
  projectId: string;
  name: string;
  color: string;
}
