/**
 * React Hook for Instructor Permissions
 *
 * This hook provides an easy way to check instructor permissions in React components.
 * It works with both the Instructor object and cookies (for instructor authentication).
 */

import { useMemo, ReactNode } from 'react';
import { Instructor } from '@/types/database';
import { Permission } from '@/lib/roles/config';
import { createPermissionChecker } from '@/lib/roles/permissions';

/**
 * Hook to check instructor permissions
 *
 * @param instructor - The instructor object to check permissions for
 * @returns Object with permission checking methods
 *
 * @example
 * const permissions = useInstructorPermissions(instructor);
 *
 * if (permissions.canViewAllCourses()) {
 *   // Show all courses
 * }
 *
 * if (permissions.has('courses.edit.all')) {
 *   // Show edit button
 * }
 */
export function useInstructorPermissions(instructor: Instructor | null | undefined) {
  return useMemo(() => createPermissionChecker(instructor), [instructor]);
}

/**
 * HOC to conditionally render components based on permissions
 *
 * @example
 * <PermissionGate instructor={instructor} permission="courses.create">
 *   <CreateCourseButton />
 * </PermissionGate>
 *
 * <PermissionGate instructor={instructor} anyPermission={['courses.edit.all', 'courses.delete.all']}>
 *   <AdminActions />
 * </PermissionGate>
 */
interface PermissionGateProps {
  instructor: Instructor | null | undefined;
  children: ReactNode;

  // Check for a single permission
  permission?: Permission;

  // Check if user has ANY of these permissions
  anyPermission?: Permission[];

  // Check if user has ALL of these permissions
  allPermissions?: Permission[];

  // Fallback content if permission check fails
  fallback?: ReactNode;
}

export function PermissionGate({
  instructor,
  children,
  permission,
  anyPermission,
  allPermissions,
  fallback = null,
}: PermissionGateProps): ReactNode {
  const permissions = useInstructorPermissions(instructor);

  let hasAccess = false;

  if (permission) {
    hasAccess = permissions.has(permission);
  } else if (anyPermission) {
    hasAccess = permissions.hasAny(anyPermission);
  } else if (allPermissions) {
    hasAccess = permissions.hasAll(allPermissions);
  }

  if (hasAccess) {
    return children;
  }

  return fallback;
}

/**
 * Hook to check if instructor is admin
 *
 * @example
 * const isAdmin = useIsAdmin(instructor);
 *
 * if (isAdmin) {
 *   // Show admin panel
 * }
 */
export function useIsAdmin(instructor: Instructor | null | undefined): boolean {
  const permissions = useInstructorPermissions(instructor);
  return permissions.isAdmin();
}

/**
 * Hook to check if instructor has admin access (any admin permission)
 *
 * @example
 * const hasAdminAccess = useHasAdminAccess(instructor);
 *
 * if (hasAdminAccess) {
 *   // Show some admin features
 * }
 */
export function useHasAdminAccess(instructor: Instructor | null | undefined): boolean {
  const permissions = useInstructorPermissions(instructor);
  return permissions.hasAdminAccess();
}
