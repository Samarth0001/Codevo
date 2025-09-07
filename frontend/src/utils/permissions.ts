export type UserRole = 'owner' | 'editor' | 'reader';

export interface PermissionConfig {
  canEditCode: boolean;
  canAccessTerminal: boolean;
  canAccessVCS: boolean;
  canInviteCollaborators: boolean;
  canRemoveCollaborators: boolean;
  canDeleteProject: boolean;
  canEditProjectSettings: boolean;
}

export const getPermissionsForRole = (role: UserRole): PermissionConfig => {
  switch (role) {
    case 'owner':
      return {
        canEditCode: true,
        canAccessTerminal: true,
        canAccessVCS: true,
        canInviteCollaborators: true,
        canRemoveCollaborators: true,
        canDeleteProject: true,
        canEditProjectSettings: true,
      };
    case 'editor':
      return {
        canEditCode: true,
        canAccessTerminal: true,
        canAccessVCS: false,
        canInviteCollaborators: false,
        canRemoveCollaborators: false,
        canDeleteProject: false,
        canEditProjectSettings: false,
      };
    case 'reader':
      return {
        canEditCode: false,
        canAccessTerminal: false,
        canAccessVCS: false,
        canInviteCollaborators: false,
        canRemoveCollaborators: false,
        canDeleteProject: false,
        canEditProjectSettings: false,
      };
    default:
      return {
        canEditCode: false,
        canAccessTerminal: false,
        canAccessVCS: false,
        canInviteCollaborators: false,
        canRemoveCollaborators: false,
        canDeleteProject: false,
        canEditProjectSettings: false,
      };
  }
};

export const getUserRoleInProject = (user: any, projectId: string): UserRole | null => {
  if (!user?.projects) return null;
  
  const project = user.projects.find((p: any) => p.projectId === projectId || p.id === projectId);
  return project?.role || null;
};

export const hasPermission = (user: any, projectId: string, permission: keyof PermissionConfig): boolean => {
  const role = getUserRoleInProject(user, projectId);
  if (!role) return false;
  
  const permissions = getPermissionsForRole(role);
  return permissions[permission];
};
