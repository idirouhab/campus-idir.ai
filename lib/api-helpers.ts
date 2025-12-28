import { NextRequest, NextResponse } from 'next/server';
import { verifyCSRFToken } from './csrf';
import { getSession, SessionUser } from './session';

/**
 * Verify CSRF token from request header
 */
export async function verifyCSRF(request: NextRequest): Promise<boolean> {
  const csrfToken = request.headers.get('x-csrf-token');
  return await verifyCSRFToken(csrfToken);
}

/**
 * API route wrapper with authentication and CSRF protection
 */
export async function protectedApiRoute(
  request: NextRequest,
  handler: (request: NextRequest, session: SessionUser) => Promise<NextResponse>,
  options: {
    requireAuth?: boolean;
    requireCSRF?: boolean;
    allowedMethods?: string[];
  } = {}
) {
  const {
    requireAuth = true,
    requireCSRF = true,
    allowedMethods = ['POST', 'PUT', 'PATCH', 'DELETE'],
  } = options;

  // Check allowed methods
  if (allowedMethods.length > 0 && !allowedMethods.includes(request.method)) {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }

  // Check authentication
  let session = null;
  if (requireAuth) {
    session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
  }

  // Check CSRF for state-changing operations
  if (
    requireCSRF &&
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)
  ) {
    const isValidCSRF = await verifyCSRF(request);
    if (!isValidCSRF) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }
  }

  // Call handler with session
  return await handler(request, session!);
}
