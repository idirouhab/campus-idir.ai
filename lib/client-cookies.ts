/**
 * Client-side cookie utilities
 * SECURITY: For reading non-httpOnly cookies from the browser
 */

/**
 * Get a cookie value by name (client-side only)
 * @param name - Cookie name to retrieve
 * @returns Cookie value or null if not found
 */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);

  if (parts.length === 2) {
    const cookieValue = parts.pop()?.split(';').shift();
    return cookieValue || null;
  }

  return null;
}

/**
 * Get CSRF token from cookie (client-side only)
 * SECURITY: CSRF cookie is set with httpOnly: false so it can be read by JavaScript
 * @returns CSRF token or null if not found
 */
export function getCSRFTokenFromCookie(): string | null {
  return getCookie('csrf_token');
}
