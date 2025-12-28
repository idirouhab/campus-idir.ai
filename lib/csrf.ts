import { randomBytes } from 'crypto';
import { getCSRFCookie, setCSRFCookie } from './cookies';

/**
 * Generate CSRF token
 */
export function generateCSRFToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Verify CSRF token matches the cookie value
 */
export async function verifyCSRFToken(token: string | null): Promise<boolean> {
  if (!token) {
    return false;
  }

  const storedToken = await getCSRFCookie();
  return storedToken === token;
}

/**
 * Get existing CSRF token or create a new one
 */
export async function getOrCreateCSRFToken(): Promise<string> {
  let token = await getCSRFCookie();

  if (!token) {
    token = generateCSRFToken();
    await setCSRFCookie(token);
  }

  return token;
}
