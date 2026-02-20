export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'archived';
  ownerId: string;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectCreate {
  name: string;
  description?: string;
}

export interface ProjectUpdate {
  name?: string;
  description?: string;
  status?: 'active' | 'archived';
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: 'project_admin' | 'member' | 'viewer';
  joinedAt: number;
}

export interface ProjectMemberWithUser extends ProjectMember {
  user: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl?: string;
  };
}

export interface ProjectWithStats extends Project {
  memberCount: number;
  taskCount: number;
}
