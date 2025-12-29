'use client';

import { useEffect, useState } from 'react';
import { Instructor } from '@/types/database';
import { instructorSignInAction, instructorSignUpAction, instructorSignOutAction, verifyInstructorAction } from '@/lib/instructor-auth-actions';

interface InstructorAuthReturn {
  instructor: Instructor | null;
  loading: boolean;
  csrfToken: string | null;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, firstName: string, lastName: string, dateOfBirth: string, country: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshInstructor: () => Promise<void>;
}

export function useInstructorAuth(): InstructorAuthReturn {
  const [instructor, setInstructor] = useState<Instructor | null>(null);
  const [loading, setLoading] = useState(true);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  useEffect(() => {
    // Migration: Clear old cookie-based session
    // Note: Can't directly access httpOnly cookies from JS, but clear any old non-httpOnly ones
    // Users will need to log in again with the new system
    console.log('[useInstructorAuth] Initializing with new session system');

    // Clear old cookies if they exist
    if (document.cookie.includes('instructorId=') || document.cookie.includes('userType=')) {
      console.log('[useInstructorAuth] Clearing old cookie session');
      document.cookie = 'instructorId=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'userType=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }

    // Check if user is logged in via session API
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/session', {
          credentials: 'include', // Include httpOnly cookies
        });



        if (!response.ok) {
          setInstructor(null);
          setCsrfToken(null);
          setLoading(false);
          return;
        }

        const data = await response.json();

        console.log('[useInstructorAuth] Session data:', data);

        if (data.user && data.user.userType === 'instructor') {
          // Fetch full instructor profile data
          const instructorResult = await verifyInstructorAction(data.user.id);
          if (instructorResult.success && instructorResult.data) {
            setInstructor(instructorResult.data);
            setCsrfToken(data.csrfToken);
          } else {
            setInstructor(null);
            setCsrfToken(null);
          }
        } else {
          setInstructor(null);
          setCsrfToken(null);
        }
      } catch (err) {
        console.error('[useInstructorAuth] Error during auth check:', err);
        setInstructor(null);
        setCsrfToken(null);
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      // Call server action for sign in (sets httpOnly cookie)
      const result = await instructorSignInAction(email, password);

      if (!result.success) {
        return { error: { message: result.error || 'Invalid email or password' } };
      }

      // Fetch session to update state
      const response = await fetch('/api/auth/session', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user && data.user.userType === 'instructor') {
          // Fetch full instructor profile data
          const instructorResult = await verifyInstructorAction(data.user.id);

          if (instructorResult.success && instructorResult.data) {
            setInstructor(instructorResult.data);
            setCsrfToken(data.csrfToken);
          }
        }
      }

      return { error: null };
    } catch (err: any) {
      return { error: { message: err.message || 'Login failed' } };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    dateOfBirth: string,
    country: string
  ) => {
    try {
      // Call server action for sign up
      const result = await instructorSignUpAction(email, password, firstName, lastName, dateOfBirth, country);

      if (!result.success) {
        return {
          error: {
            message: result.error || 'Signup failed',
            validationErrors: result.validationErrors
          }
        };
      }

      // Successfully created
      return { error: null };
    } catch (err: any) {
      return { error: { message: err.message || 'Signup failed' } };
    }
  };

  const signOut = async () => {
    try {
      // Call server action to remove auth cookie
      await instructorSignOutAction();
    } catch (err) {
      console.error('[useInstructorAuth] Error during sign out:', err);
    }
    // Clear state regardless of server action result
    setInstructor(null);
    setCsrfToken(null);
  };

  const refreshInstructor = async () => {
    try {
      const response = await fetch('/api/auth/session', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user && data.user.userType === 'instructor') {
          // Fetch full instructor profile data
          const instructorResult = await verifyInstructorAction(data.user.id);

          if (instructorResult.success && instructorResult.data) {
            setInstructor(instructorResult.data);
            setCsrfToken(data.csrfToken);
          } else {
            setInstructor(null);
            setCsrfToken(null);
          }
        } else {
          setInstructor(null);
          setCsrfToken(null);
        }
      } else {
        setInstructor(null);
        setCsrfToken(null);
      }
    } catch (err) {
      console.error('[useInstructorAuth] Error during refresh:', err);
      setInstructor(null);
      setCsrfToken(null);
    }
  };

  return {
    instructor,
    loading,
    csrfToken,
    signIn,
    signUp,
    signOut,
    refreshInstructor,
  };
}
