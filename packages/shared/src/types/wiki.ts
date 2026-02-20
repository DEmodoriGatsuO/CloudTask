export interface WikiPage {
  id: string;
  projectId: string;
  title: string;
  content: string;
  parentPageId?: string;
  createdBy: string;
  updatedBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface WikiPageCreate {
  title: string;
  content: string;
  parentPageId?: string;
}

export interface WikiPageUpdate {
  title?: string;
  content?: string;
  parentPageId?: string | null;
}

export interface WikiPageVersion {
  id: string;
  pageId: string;
  content: string;
  editedBy: string;
  createdAt: number;
}

export interface WikiPageWithMeta extends WikiPage {
  createdByUser: { id: string; displayName: string };
  updatedByUser: { id: string; displayName: string };
  children: Array<{ id: string; title: string }>;
}
