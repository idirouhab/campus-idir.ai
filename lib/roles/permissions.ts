/**
 * Permission Checking Utilities
 *
 * These utilities make it easy to check permissions without directly checking roles.
 * This keeps the codebase flexible and maintainable as roles change.
 */

import { Instructor, InstructorRole } from '@/types/database';
import { Permission, roleHasPermission, roleHasAnyPermission, roleHasAllPermissions } from './config';

/**
 * Check if an instructor has a specific permission
 */
export function hasPermission(instructor: Instructor | null | undefined, permission: Permission): boolean {
  if (!instructor) return false;
  const role = instructor.profile?.role || 'instructor';
  return roleHasPermission(role, permission);
}

/**
 * Check if an instructor has any of the specified permissions
 */
export function hasAnyPermission(
  instructor: Instructor | null | undefined,
  permissions: Permission[]
): boolean {
  if (!instructor) return false;
  const role = instructor.profile?.role || 'instructor';
  return roleHasAnyPermission(role, permissions);
}

/**
 * Check if an instructor has all of the specified permissions
 */
export function hasAllPermissions(
  instructor: Instructor | null | undefined,
  permissions: Permission[]
): boolean {
  if (!instructor) return false;
  const role = instructor.profile?.role || 'instructor';
  return roleHasAllPermissions(role, permissions);
}

/**
 * Common permission checks as helper functions
 */

// Course permissions
export function canViewAllCourses(instructor: Instructor | null | undefined): boolean {
  return hasPermission(instructor, 'courses.view.all');
}

export function canCreateCourses(instructor: Instructor | null | undefined): boolean {
  return hasPermission(instructor, 'courses.create');
}

export function canEditAnyCourse(instructor: Instructor | null | undefined): boolean {
  return hasPermission(instructor, 'courses.edit.all');
}

export function canDeleteAnyCourse(instructor: Instructor | null | undefined): boolean {
  return hasPermission(instructor, 'courses.delete.all');
}

// Enrollment permissions
export function canViewAllEnrollments(instructor: Instructor | null | undefined): boolean {
  return hasPermission(instructor, 'enrollments.view.all');
}

export function canManageEnrollments(instructor: Instructor | null | undefined): boolean {
  return hasPermission(instructor, 'enrollments.manage');
}

// Instructor management permissions
export function canViewAllInstructors(instructor: Instructor | null | undefined): boolean {
  return hasPermission(instructor, 'instructors.view.all');
}

export function canAssignInstructors(instructor: Instructor | null | undefined): boolean {
  return hasPermission(instructor, 'instructors.assign');
}

export function canManageInstructors(instructor: Instructor | null | undefined): boolean {
  return hasPermission(instructor, 'instructors.manage');
}

// Student permissions
export function canViewAllStudents(instructor: Instructor | null | undefined): boolean {
  return hasPermission(instructor, 'students.view.all');
}

export function canManageStudents(instructor: Instructor | null | undefined): boolean {
  return hasPermission(instructor, 'students.manage');
}

// Analytics permissions
export function canViewAllAnalytics(instructor: Instructor | null | undefined): boolean {
  return hasPermission(instructor, 'analytics.view.all');
}

// System permissions
export function canAccessSystemSettings(instructor: Instructor | null | undefined): boolean {
  return hasPermission(instructor, 'system.settings');
}

export function canViewSystemLogs(instructor: Instructor | null | undefined): boolean {
  return hasPermission(instructor, 'system.logs');
}

/**
 * Higher-level permission checks
 */

// Check if user is an admin (has instructor assignment permission)
export function isAdmin(instructor: Instructor | null | undefined): boolean {
  return canAssignInstructors(instructor);
}

// Check if user can perform any admin actions
export function hasAdminAccess(instructor: Instructor | null | undefined): boolean {
  return hasAnyPermission(instructor, [
    'courses.view.all',
    'enrollments.view.all',
    'instructors.assign',
    'students.view.all',
  ]);
}

/**
 * Create a permission checker function for a specific instructor
 * Useful for repeated checks with the same instructor
 */
export function createPermissionChecker(instructor: Instructor | null | undefined) {
  return {
    has: (permission: Permission) => hasPermission(instructor, permission),
    hasAny: (permissions: Permission[]) => hasAnyPermission(instructor, permissions),
    hasAll: (permissions: Permission[]) => hasAllPermissions(instructor, permissions),

    // Course permissions
    canViewAllCourses: () => canViewAllCourses(instructor),
    canCreateCourses: () => canCreateCourses(instructor),
    canEditAnyCourse: () => canEditAnyCourse(instructor),
    canDeleteAnyCourse: () => canDeleteAnyCourse(instructor),

    // Enrollment permissions
    canViewAllEnrollments: () => canViewAllEnrollments(instructor),
    canManageEnrollments: () => canManageEnrollments(instructor),

    // Instructor management
    canViewAllInstructors: () => canViewAllInstructors(instructor),
    canAssignInstructors: () => canAssignInstructors(instructor),
    canManageInstructors: () => canManageInstructors(instructor),

    // Student permissions
    canViewAllStudents: () => canViewAllStudents(instructor),
    canManageStudents: () => canManageStudents(instructor),

    // Analytics
    canViewAllAnalytics: () => canViewAllAnalytics(instructor),

    // System
    canAccessSystemSettings: () => canAccessSystemSettings(instructor),
    canViewSystemLogs: () => canViewSystemLogs(instructor),

    // Higher-level checks
    isAdmin: () => isAdmin(instructor),
    hasAdminAccess: () => hasAdminAccess(instructor),
  };
}
