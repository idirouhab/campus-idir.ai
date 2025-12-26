/**
 * Centralized Role Configuration
 *
 * This file defines all instructor roles and their permissions.
 * To add a new role, simply add it to the ROLES config and update the database constraint.
 *
 * Permission-based system allows for flexible role management without hardcoding checks.
 */

import { InstructorRole } from '@/types/database';

/**
 * Permission keys that can be assigned to roles
 */
export type Permission =
  // Course management
  | 'courses.view.own'           // View courses assigned to them
  | 'courses.view.all'           // View all courses in the system
  | 'courses.create'             // Create new courses
  | 'courses.edit.own'           // Edit courses assigned to them
  | 'courses.edit.all'           // Edit any course
  | 'courses.delete.own'         // Delete courses assigned to them
  | 'courses.delete.all'         // Delete any course

  // Enrollment management
  | 'enrollments.view.own'       // View enrollments for their courses
  | 'enrollments.view.all'       // View all enrollments
  | 'enrollments.manage'         // Create/delete enrollments

  // Instructor management
  | 'instructors.view.all'       // View all instructors
  | 'instructors.assign'         // Assign instructors to courses
  | 'instructors.remove'         // Remove instructors from courses
  | 'instructors.manage'         // Full instructor management (create/edit/delete)

  // Student management
  | 'students.view.own'          // View students in their courses
  | 'students.view.all'          // View all students
  | 'students.manage'            // Full student management

  // Analytics
  | 'analytics.view.own'         // View analytics for their courses
  | 'analytics.view.all'         // View system-wide analytics

  // System
  | 'system.settings'            // Access system settings
  | 'system.logs'                // View system logs
  ;

/**
 * Role configuration with permissions
 *
 * To add a new role:
 * 1. Add it to InstructorRole type in types/database.ts
 * 2. Update database constraint in migration
 * 3. Add configuration here
 */
export const ROLES: Record<InstructorRole, {
  name: string;
  description: string;
  permissions: Permission[];
}> = {
  instructor: {
    name: 'Instructor',
    description: 'Regular instructor with access to their assigned courses',
    permissions: [
      'courses.view.own',
      'courses.edit.own',
      'enrollments.view.own',
      'students.view.own',
      'analytics.view.own',
    ],
  },

  admin: {
    name: 'Administrator',
    description: 'Full administrative access to manage courses, instructors, and students',
    permissions: [
      // Courses
      'courses.view.all',
      'courses.create',
      'courses.edit.all',
      'courses.delete.all',

      // Enrollments
      'enrollments.view.all',
      'enrollments.manage',

      // Instructors
      'instructors.view.all',
      'instructors.assign',
      'instructors.remove',
      'instructors.manage',

      // Students
      'students.view.all',
      'students.manage',

      // Analytics
      'analytics.view.all',

      // System
      'system.settings',
      'system.logs',
    ],
  },

  // Example of future roles (commented out until database is updated):
  //
  // super_admin: {
  //   name: 'Super Administrator',
  //   description: 'System-wide administrative access with all permissions',
  //   permissions: [
  //     ...ROLES.admin.permissions,
  //     'system.database',
  //     'system.backups',
  //   ],
  // },
  //
  // coordinator: {
  //   name: 'Program Coordinator',
  //   description: 'Manages courses and instructors within their program',
  //   permissions: [
  //     'courses.view.all',
  //     'courses.create',
  //     'courses.edit.all',
  //     'enrollments.view.all',
  //     'instructors.view.all',
  //     'instructors.assign',
  //     'students.view.all',
  //     'analytics.view.all',
  //   ],
  // },
  //
  // guest: {
  //   name: 'Guest Instructor',
  //   description: 'Limited read-only access to assigned courses',
  //   permissions: [
  //     'courses.view.own',
  //     'students.view.own',
  //   ],
  // },
};

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: InstructorRole): Permission[] {
  return ROLES[role]?.permissions || [];
}

/**
 * Check if a role has a specific permission
 */
export function roleHasPermission(role: InstructorRole, permission: Permission): boolean {
  const permissions = getRolePermissions(role);
  return permissions.includes(permission);
}

/**
 * Check if a role has any of the specified permissions
 */
export function roleHasAnyPermission(role: InstructorRole, permissions: Permission[]): boolean {
  return permissions.some(permission => roleHasPermission(role, permission));
}

/**
 * Check if a role has all of the specified permissions
 */
export function roleHasAllPermissions(role: InstructorRole, permissions: Permission[]): boolean {
  return permissions.every(permission => roleHasPermission(role, permission));
}

/**
 * Get role display name
 */
export function getRoleName(role: InstructorRole): string {
  return ROLES[role]?.name || role;
}

/**
 * Get role description
 */
export function getRoleDescription(role: InstructorRole): string {
  return ROLES[role]?.description || '';
}

/**
 * Get all available roles
 */
export function getAllRoles(): InstructorRole[] {
  return Object.keys(ROLES) as InstructorRole[];
}

/**
 * Check if a role is admin or higher
 * (useful for quick checks without listing all admin permissions)
 */
export function isAdminRole(role: InstructorRole): boolean {
  return roleHasPermission(role, 'instructors.assign');
}
