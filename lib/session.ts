import { getAuthCookie } from './cookies';
import { verifyToken } from './jwt';
import { getDb } from './db';
import type { AppRole } from './roles/app-role';

export interface SessionUser {
  id: string;
  email: string;
  userType: 'student' | 'instructor';
  roles: AppRole[];
  firstName: string;
  lastName: string;
  birthday?: string;
  hasStudentProfile: boolean; // Can access student views
  hasInstructorProfile: boolean; // Can access instructor views
  currentView: 'student' | 'instructor'; // Current active view
}

/**
 * Get current session from JWT cookie
 * Returns user data or null if not authenticated
 */
export async function getSession(): Promise<SessionUser | null> {
  try {
    const token = await getAuthCookie();
    if (!token) {
      return null;
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return null;
    }

    // Fetch fresh user data from unified users table
    const sql = getDb();

    // Always check roles for dual-role support
    const result = await sql`
      SELECT u.id, u.email, u.first_name, u.last_name, u.birthday, u.is_active,
             COALESCE(
               ARRAY_REMOVE(ARRAY_AGG(ur.role), NULL),
               ARRAY[]::app_role[]
             ) as roles
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      WHERE u.id = ${payload.userId}
      GROUP BY u.id
    `;

    if (result.length === 0 || !result[0].is_active) {
      return null;
    }

    const user = result[0];
    const roles = (user.roles || []) as AppRole[];
    const hasStudentProfile = roles.includes('student');
    const hasInstructorProfile = roles.includes('instructor');

    // Backwards compatibility: Handle old JWT tokens without new fields
    const currentView = payload.currentView || payload.userType;

    // Validate user has access based on their userType
    if (payload.userType === 'student' && !hasStudentProfile) {
      return null;
    }
    if (payload.userType === 'instructor' && !hasInstructorProfile) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      userType: payload.userType,
      roles,
      firstName: user.first_name,
      lastName: user.last_name,
      birthday: user.birthday,
      hasStudentProfile,
      hasInstructorProfile,
      currentView,
    };
  } catch (error) {
    console.error('[Session] Error getting session:', error);
    return null;
  }
}

/**
 * Require session (throws if not authenticated)
 */
export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}

/**
 * Require specific user type
 * For dual-role users, this checks if they have the required profile
 */
export async function requireUserType(
  userType: 'student' | 'instructor'
): Promise<SessionUser> {
  const session = await requireSession();

  // For dual-role users, check profile availability instead of strict userType
  if (userType === 'student') {
    if (!session.hasStudentProfile) {
      throw new Error('Forbidden: Student profile required');
    }
  } else if (userType === 'instructor') {
    if (!session.hasInstructorProfile) {
      throw new Error('Forbidden: Instructor profile required');
    }
  }

  return session;
}

/**
 * Require admin role
 */
export async function requireAdmin(): Promise<SessionUser> {
  const session = await requireSession();
  const hasAdminRole =
    session.roles.includes('super_admin') || session.roles.includes('billing_admin');
  if (!hasAdminRole) {
    throw new Error('Forbidden: Admin access required');
  }
  return session;
}

/**
 * Require super admin role
 */
export async function requireSuperAdmin(): Promise<SessionUser> {
  const session = await requireSession();
  if (!session.roles.includes('super_admin')) {
    throw new Error('Forbidden: Super admin access required');
  }
  return session;
}
