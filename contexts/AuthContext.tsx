'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Student } from '@/types/database';
import { signInAction, signUpAction, signOutAction } from '@/lib/auth-actions';

interface AuthContextType {
  user: Student | null;
  loading: boolean;
  csrfToken: string | null;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    // Skip student auth check on instructor routes (prevents duplicate API calls)
    const isInstructorRoute = pathname?.startsWith('/instructor');
    if (isInstructorRoute) {
      setUser(null);
      setCsrfToken(null);
      setLoading(false);
      return;
    }

    // Migration: Clear old localStorage session
    const oldStudent = localStorage.getItem('student');
    if (oldStudent) {
      console.log('[AuthContext] Clearing old localStorage session');
      localStorage.removeItem('student');
    }

    // Check if user is logged in via session API
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/session', {
          credentials: 'include', // Include httpOnly cookies
        });

        if (!response.ok) {
          setUser(null);
          setCsrfToken(null);
          setLoading(false);
          return;
        }

        const data = await response.json();
        console.log('[AuthContext] Session data:', data);

        if (data.user && data.user.userType === 'student') {
          // Session API returns SessionUser, convert to Student format
          const studentUser: Student = {
            id: data.user.id,
            email: data.user.email,
            first_name: data.user.firstName,
            last_name: data.user.lastName,
            type: 'student',
            is_active: true,
            email_verified: false,
            created_at: '',
            updated_at: '',
          };
          setUser(studentUser);
          setCsrfToken(data.csrfToken);
        } else {
          setUser(null);
          setCsrfToken(null);
        }
      } catch (err) {
        console.error('[AuthContext] Error during auth check:', err);
        setUser(null);
        setCsrfToken(null);
      }
      setLoading(false);
    };

    checkAuth();
  }, [pathname]);

  const signIn = async (email: string, password: string) => {
    try {
      // Call server action for sign in (sets httpOnly cookie)
      const result = await signInAction(email, password);

      if (!result.success) {
        return { error: { message: result.error || 'Invalid email or password' } };
      }

      // Fetch session to update state
      const response = await fetch('/api/auth/session', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user && data.user.userType === 'student') {
          const studentUser: Student = {
            id: data.user.id,
            email: data.user.email,
            first_name: data.user.firstName,
            last_name: data.user.lastName,
            type: 'student',
            is_active: true,
            email_verified: false,
            created_at: '',
            updated_at: '',
          };
          setUser(studentUser);
          setCsrfToken(data.csrfToken);
        }
      }

      return { error: null };
    } catch (err: any) {
      return { error: { message: err.message || 'Login failed' } };
    }
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      // Call server action for sign up
      const result = await signUpAction(email, password, firstName, lastName);

      if (!result.success) {
        return {
          error: {
            message: result.error || 'Signup failed',
            validationErrors: result.validationErrors
          }
        };
      }

      // Successfully created - in a production app, you'd send verification email here
      // For now, we'll just return success
      return { error: null };
    } catch (err: any) {
      return { error: { message: err.message || 'Signup failed' } };
    }
  };

  const signOut = async () => {
    try {
      // Call server action to remove auth cookie
      await signOutAction();
    } catch (err) {
      console.error('[AuthContext] Error during sign out:', err);
    }
    // Clear state regardless of server action result
    setUser(null);
    setCsrfToken(null);
  };

  const refreshUser = async () => {
    try {
      const response = await fetch('/api/auth/session', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user && data.user.userType === 'student') {
          const studentUser: Student = {
            id: data.user.id,
            email: data.user.email,
            first_name: data.user.firstName,
            last_name: data.user.lastName,
            type: 'student',
            is_active: true,
            email_verified: false,
            created_at: '',
            updated_at: '',
          };
          setUser(studentUser);
          setCsrfToken(data.csrfToken);
        } else {
          setUser(null);
          setCsrfToken(null);
        }
      } else {
        setUser(null);
        setCsrfToken(null);
      }
    } catch (err) {
      console.error('[AuthContext] Error during refresh:', err);
      setUser(null);
      setCsrfToken(null);
    }
  };

  const value = {
    user,
    loading,
    csrfToken,
    signIn,
    signUp,
    signOut,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
