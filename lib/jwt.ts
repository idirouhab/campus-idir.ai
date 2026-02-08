import { SignJWT, jwtVerify } from 'jose';
import type { AppRole } from './roles/app-role';

// JWT Configuration - CRITICAL: Enforce secure secret
const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      'SECURITY: JWT_SECRET environment variable must be set. ' +
      'Generate a secure secret with: openssl rand -base64 32'
    );
  }
  if (secret.length < 32) {
    throw new Error(
      'SECURITY: JWT_SECRET must be at least 32 characters long. ' +
      'Current length: ' + secret.length
    );
  }
  return new TextEncoder().encode(secret);
})();
const JWT_ALGORITHM = 'HS256';
const JWT_EXPIRATION = '7d'; // 7 days

// JWT Payload Structure
export interface JWTPayload {
  userId: string;
  userType: 'student' | 'instructor';
  email: string;
  roles?: AppRole[];
  hasStudentProfile?: boolean; // Can access student views
  hasInstructorProfile?: boolean; // Can access instructor views
  currentView?: 'student' | 'instructor'; // Current active view
  iat: number;
  exp: number;
  type: 'access';
}

/**
 * Generate JWT access token
 */
export async function generateAccessToken(
  userId: string,
  userType: 'student' | 'instructor',
  email: string,
  roles?: AppRole[],
  hasStudentProfile?: boolean,
  hasInstructorProfile?: boolean,
  currentView?: 'student' | 'instructor'
): Promise<string> {
  const token = await new SignJWT({
    userId,
    userType,
    email,
    roles,
    hasStudentProfile,
    hasInstructorProfile,
    currentView: currentView || userType,
    type: 'access',
  })
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRATION)
    .sign(JWT_SECRET);

  return token;
}

/**
 * Verify and decode JWT token
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      algorithms: [JWT_ALGORITHM],
    });
    return payload as unknown as JWTPayload;
  } catch (error) {
    console.error('[JWT] Token verification failed:', error);
    return null;
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(payload: JWTPayload): boolean {
  return Date.now() >= payload.exp * 1000;
}
