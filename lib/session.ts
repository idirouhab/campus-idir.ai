import { getAuthCookie } from './cookies';
import { verifyToken } from './jwt';
import { getDb } from './db';

export interface SessionUser {
  id: string;
  email: string;
  userType: 'student' | 'instructor';
  role?: 'instructor' | 'admin';
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

    // Always check BOTH profile tables for dual-role support
    const result = await sql`
      SELECT u.id, u.email, u.first_name, u.last_name, u.birthday, u.is_active,
             sp.user_id as has_student_profile,
             ip.user_id as has_instructor_profile, ip.role
      FROM users u
      LEFT JOIN student_profiles sp ON sp.user_id = u.id
      LEFT JOIN instructor_profiles ip ON ip.user_id = u.id
      WHERE u.id = ${payload.userId}
    `;

    if (result.length === 0 || !result[0].is_active) {
      return null;
    }

    const user = result[0];
    const hasStudentProfile = !!user.has_student_profile;
    const hasInstructorProfile = !!user.has_instructor_profile;

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
      role: user.role || (hasInstructorProfile ? 'instructor' : undefined),
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
 */
export async function requireUserType(
  userType: 'student' | 'instructor'
): Promise<SessionUser> {
  const session = await requireSession();
  if (session.userType !== userType) {
    throw new Error('Forbidden: Invalid user type');
  }
  return session;
}

/**
 * Require admin role
 */
export async function requireAdmin(): Promise<SessionUser> {
  const session = await requireSession();
  if (session.userType !== 'instructor' || session.role !== 'admin') {
    throw new Error('Forbidden: Admin access required');
  }
  return session;
}
