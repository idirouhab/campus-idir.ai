import { cookies } from 'next/headers';
import { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';

// Cookie names
export const AUTH_COOKIE_NAME = 'auth_token';
export const CSRF_COOKIE_NAME = 'csrf_token';

// Cookie configuration
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Get secure cookie options
 * SECURITY: Using sameSite='strict' to prevent CSRF attacks
 */
export const getSecureCookieOptions = (): Partial<ResponseCookie> => ({
  httpOnly: true,
  secure: !isDevelopment, // true in production, false in dev
  sameSite: 'strict', // SECURITY: Changed from 'lax' to 'strict' for better CSRF protection
  path: '/',
  maxAge: COOKIE_MAX_AGE,
});

/**
 * Set auth token cookie
 */
export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, getSecureCookieOptions());
}

/**
 * Get auth token from cookies
 */
export async function getAuthCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_COOKIE_NAME)?.value;
}

/**
 * Remove auth cookie
 */
export async function removeAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}

/**
 * Set CSRF token cookie
 * SECURITY: CSRF token readable by client, but with strict sameSite
 */
export async function setCSRFCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // CSRF token needs to be readable by client
    secure: !isDevelopment,
    sameSite: 'strict', // SECURITY: Changed from 'lax' to 'strict' for better CSRF protection
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
}

/**
 * Get CSRF token from cookies
 */
export async function getCSRFCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(CSRF_COOKIE_NAME)?.value;
}
