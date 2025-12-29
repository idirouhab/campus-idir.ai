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

    // Fetch fresh user data from unified users table
    const sql = getDb();

    if (payload.userType === 'student') {
      const result = await sql`
        SELECT u.id, u.email, u.first_name, u.last_name, u.is_active
        FROM users u
        WHERE u.id = ${payload.userId} AND u.type = 'student'
      `;

      if (result.length === 0 || !result[0].is_active) {
        return null;
      }

      const user = result[0];
      return {
        id: user.id,
        email: user.email,
        userType: 'student',
        firstName: user.first_name,
        lastName: user.last_name,
      };
    } else {
      // Query user with instructor profile to get role
      const result = await sql`
        SELECT u.id, u.email, u.first_name, u.last_name, u.is_active, ip.role
        FROM users u
        LEFT JOIN instructor_profiles ip ON ip.user_id = u.id
        WHERE u.id = ${payload.userId} AND u.type = 'instructor'
      `;

      if (result.length === 0 || !result[0].is_active) {
        return null;
      }

      const user = result[0];
      return {
        id: user.id,
        email: user.email,
        userType: 'instructor',
        role: user.role || 'instructor',
        firstName: user.first_name,
        lastName: user.last_name,
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
