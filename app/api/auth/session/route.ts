import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getOrCreateCSRFToken } from '@/lib/csrf';

/**
 * GET /api/auth/session
 * Returns current user session and CSRF token
 * Used by client to check authentication status
 */
export async function GET() {
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
