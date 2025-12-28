import { SignJWT, jwtVerify } from 'jose';

// JWT Configuration
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-min-32-chars'
);
const JWT_ALGORITHM = 'HS256';
const JWT_EXPIRATION = '7d'; // 7 days

// JWT Payload Structure
export interface JWTPayload {
  userId: string;
  userType: 'student' | 'instructor';
  role?: 'instructor' | 'admin'; // Only for instructors
  email: string;
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
  role?: 'instructor' | 'admin'
): Promise<string> {
  const token = await new SignJWT({
    userId,
    userType,
    email,
    role: userType === 'instructor' ? role : undefined,
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
