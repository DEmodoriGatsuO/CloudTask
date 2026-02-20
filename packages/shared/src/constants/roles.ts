export const SYSTEM_ROLES = ['admin', 'member'] as const;
export type SystemRole = (typeof SYSTEM_ROLES)[number];

export const PROJECT_ROLES = ['project_admin', 'member', 'viewer'] as const;
export type ProjectRole = (typeof PROJECT_ROLES)[number];

export const ROLE_HIERARCHY: Record<string, number> = {
  viewer: 1,
  member: 2,
  project_admin: 3,
  admin: 4,
};
