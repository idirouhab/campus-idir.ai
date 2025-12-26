/**
 * Role and Permission System
 *
 * Centralized exports for the role-based access control system.
 */

// Configuration
export {
  ROLES,
  getRolePermissions,
  roleHasPermission,
  roleHasAnyPermission,
  roleHasAllPermissions,
  getRoleName,
  getRoleDescription,
  getAllRoles,
  isAdminRole,
} from './config';

export type { Permission } from './config';

// Permission utilities
export {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  canViewAllCourses,
  canCreateCourses,
  canEditAnyCourse,
  canDeleteAnyCourse,
  canViewAllEnrollments,
  canManageEnrollments,
  canViewAllInstructors,
  canAssignInstructors,
  canManageInstructors,
  canViewAllStudents,
  canManageStudents,
  canViewAllAnalytics,
  canAccessSystemSettings,
  canViewSystemLogs,
  isAdmin,
  hasAdminAccess,
  createPermissionChecker,
} from './permissions';
