import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './lib/jwt';

// Define protected routes
const PROTECTED_ROUTES = {
  student: ['/dashboard', '/course/'],
  instructor: ['/instructor/dashboard'],
  public: ['/login', '/signup', '/instructor/login', '/instructor/signup', '/student/login', '/student/signup'],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get auth token from cookies
  const token = request.cookies.get('auth_token')?.value;

  // Verify token
  let payload = null;
  if (token) {
    payload = await verifyToken(token);
  }

  // Check if route is protected for students
  const isStudentRoute = PROTECTED_ROUTES.student.some((route) =>
    pathname.startsWith(route)
  );
  if (isStudentRoute) {
    if (!payload || payload.userType !== 'student') {
      return NextResponse.redirect(new URL('/student/login', request.url));
    }
  }

  // Check if route is protected for instructors
  const isInstructorRoute = PROTECTED_ROUTES.instructor.some((route) =>
    pathname.startsWith(route)
  );
  if (isInstructorRoute) {
    if (!payload || payload.userType !== 'instructor') {
      return NextResponse.redirect(new URL('/instructor/login', request.url));
    }
  }

  // Redirect authenticated users away from login pages
  const isPublicAuthRoute = PROTECTED_ROUTES.public.some(
    (route) => pathname === route
  );
  if (isPublicAuthRoute && payload) {
    if (payload.userType === 'instructor') {
      return NextResponse.redirect(new URL('/instructor/dashboard', request.url));
    } else {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

// Configure which routes middleware runs on
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/course/:path*',
    '/instructor/:path*',
    '/login',
    '/signup',
    '/student/login',
    '/student/signup',
    '/api/:path*',
  ],
};
