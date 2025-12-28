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

    // Fetch fresh user data from database
    const sql = getDb();

    if (payload.userType === 'student') {
      const result = await sql`
        SELECT id, email, first_name, last_name
        FROM students
        WHERE id = ${payload.userId}
      `;

      if (result.length === 0) {
        return null;
      }

      const student = result[0];
      return {
        id: student.id,
        email: student.email,
        userType: 'student',
        firstName: student.first_name,
        lastName: student.last_name,
      };
    } else {
      const result = await sql`
        SELECT id, email, first_name, last_name, role, is_active
        FROM instructors
        WHERE id = ${payload.userId}
      `;

      if (result.length === 0 || !result[0].is_active) {
        return null;
      }

      const instructor = result[0];
      return {
        id: instructor.id,
        email: instructor.email,
        userType: 'instructor',
        role: instructor.role,
        firstName: instructor.first_name,
        lastName: instructor.last_name,
      };
    }
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
