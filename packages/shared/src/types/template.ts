export interface ProjectTemplate {
  id: string;
  name: string;
  description?: string;
  templateData: {
    projectName: string;
    projectDescription?: string;
    tasks: Array<{
      title: string;
      description?: string;
      status: string;
      priority: string;
    }>;
    labels: Array<{
      name: string;
      color: string;
    }>;
  };
  createdBy: string;
  createdAt: number;
}

export interface ProjectTemplateCreate {
  name: string;
  description?: string;
  templateData: ProjectTemplate['templateData'];
}
