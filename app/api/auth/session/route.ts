import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getOrCreateCSRFToken } from '@/lib/csrf';

/**
 * GET /api/auth/session
 * Returns current user session
 * Used by client to check authentication status
 *
 * SECURITY: CSRF token is no longer returned in GET response.
 * The token is set as a cookie (httpOnly: false) and can be read client-side.
 * This prevents CSRF tokens from being logged in browser history or proxy logs.
 */
export async function GET() {
  try {
    const session = await getSession();
    // Ensure CSRF token cookie is set (but don't return it in response)
    await getOrCreateCSRFToken();

    return NextResponse.json({
      user: session,
    });
  } catch (error) {
    console.error('[Session API] Error:', error);
    return NextResponse.json(
      { user: null },
      { status: 200 }
    );
  }
}

/**
 * POST /api/auth/session
 * Returns current user session and CSRF token
 * SECURITY: CSRF token should be obtained via POST to prevent logging in GET requests
 */
export async function POST() {
  try {
    const session = await getSession();
    const csrfToken = await getOrCreateCSRFToken();

    return NextResponse.json({
      user: session,
      csrfToken,
    });
  } catch (error) {
    console.error('[Session API] Error:', error);
    return NextResponse.json(
      { user: null, csrfToken: null },
      { status: 200 }
    );
  }
}
