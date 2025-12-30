'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Student } from '@/types/database';
import { unifiedSignInAction, signUpAction, signOutAction } from '@/lib/auth-actions';
import { switchViewAction } from '@/lib/view-switch-actions';

interface AuthContextType {
  user: Student | null;
  loading: boolean;
  csrfToken: string | null;
  hasStudentProfile: boolean;
  hasInstructorProfile: boolean;
  isDualRole: boolean;
  currentView: 'student' | 'instructor' | null;
  instructorRole: 'instructor' | 'admin' | null;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, firstName: string, lastName: string, dateOfBirth: string, timezone?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  switchView: (view: 'student' | 'instructor') => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [hasStudentProfile, setHasStudentProfile] = useState(false);
  const [hasInstructorProfile, setHasInstructorProfile] = useState(false);
  const [currentView, setCurrentView] = useState<'student' | 'instructor' | null>(null);
  const [instructorRole, setInstructorRole] = useState<'instructor' | 'admin' | null>(null);
  const router = useRouter();

  useEffect(() => {

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
          setHasStudentProfile(false);
          setHasInstructorProfile(false);
          setCurrentView(null);
          setInstructorRole(null);
          setLoading(false);
          return;
        }

        const data = await response.json();
        console.log('[AuthContext] Session data:', data);

        if (data.user) {
          // Populate dual-role state
          setHasStudentProfile(data.user.hasStudentProfile || false);
          setHasInstructorProfile(data.user.hasInstructorProfile || false);
          setCurrentView(data.user.currentView || null);
          setInstructorRole(data.user.role || null);

          // Convert SessionUser to Student format
          const studentUser: Student = {
            id: data.user.id,
            email: data.user.email,
            first_name: data.user.firstName,
            last_name: data.user.lastName,
            birthday: data.user.birthday,
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
          setHasStudentProfile(false);
          setHasInstructorProfile(false);
          setCurrentView(null);
          setInstructorRole(null);
        }
      } catch (err) {
        console.error('[AuthContext] Error during auth check:', err);
        setUser(null);
        setCsrfToken(null);
        setHasStudentProfile(false);
        setHasInstructorProfile(false);
        setCurrentView(null);
        setInstructorRole(null);
      }
      setLoading(false);
    };

    checkAuth();
  }, []); // Run once on mount

  const signIn = async (email: string, password: string) => {
    try {
      // Call unified server action for sign in (sets httpOnly cookie)
      const result = await unifiedSignInAction(email, password);

      if (!result.success) {
        return { error: { message: result.error || 'Invalid email or password' } };
      }

      // Fetch session to update state
      const response = await fetch('/api/auth/session', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          // Populate dual-role state
          setHasStudentProfile(data.user.hasStudentProfile || false);
          setHasInstructorProfile(data.user.hasInstructorProfile || false);
          setCurrentView(data.user.currentView || null);
          setInstructorRole(data.user.role || null);

          const studentUser: Student = {
            id: data.user.id,
            email: data.user.email,
            first_name: data.user.firstName,
            last_name: data.user.lastName,
            birthday: data.user.birthday,
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

  const signUp = async (email: string, password: string, firstName: string, lastName: string, dateOfBirth: string, timezone: string = 'Europe/Berlin') => {
    try {
      // Call server action for sign up
      const result = await signUpAction(email, password, firstName, lastName, dateOfBirth, timezone);

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
    // Clear all state regardless of server action result
    setUser(null);
    setCsrfToken(null);
    setHasStudentProfile(false);
    setHasInstructorProfile(false);
    setCurrentView(null);
    setInstructorRole(null);
  };

  const refreshUser = async () => {
    try {
      const response = await fetch('/api/auth/session', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          // Populate dual-role state
          setHasStudentProfile(data.user.hasStudentProfile || false);
          setHasInstructorProfile(data.user.hasInstructorProfile || false);
          setCurrentView(data.user.currentView || null);
          setInstructorRole(data.user.role || null);

          const studentUser: Student = {
            id: data.user.id,
            email: data.user.email,
            first_name: data.user.firstName,
            last_name: data.user.lastName,
            birthday: data.user.birthday,
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
          setHasStudentProfile(false);
          setHasInstructorProfile(false);
          setCurrentView(null);
          setInstructorRole(null);
        }
      } else {
        setUser(null);
        setCsrfToken(null);
        setHasStudentProfile(false);
        setHasInstructorProfile(false);
        setCurrentView(null);
        setInstructorRole(null);
      }
    } catch (err) {
      console.error('[AuthContext] Error during refresh:', err);
      setUser(null);
      setCsrfToken(null);
      setHasStudentProfile(false);
      setHasInstructorProfile(false);
      setCurrentView(null);
      setInstructorRole(null);
    }
  };

  const switchView = async (view: 'student' | 'instructor') => {
    try {
      // Validate user can access this view
      if (view === 'student' && !hasStudentProfile) {
        throw new Error('You do not have a student profile');
      }
      if (view === 'instructor' && !hasInstructorProfile) {
        throw new Error('You do not have an instructor profile');
      }

      // Call server action to update JWT with new currentView
      const result = await switchViewAction(view);

      if (!result.success) {
        throw new Error(result.error || 'Failed to switch view');
      }

      // Refresh session to get updated state
      await refreshUser();

      // Navigate to appropriate dashboard
      if (view === 'student') {
        router.push('/dashboard');
      } else {
        router.push('/instructor/dashboard');
      }
    } catch (err: any) {
      console.error('[AuthContext] Error switching view:', err);
      throw err;
    }
  };

  const value = {
    user,
    loading,
    csrfToken,
    hasStudentProfile,
    hasInstructorProfile,
    isDualRole: hasStudentProfile && hasInstructorProfile,
    currentView,
    instructorRole,
    signIn,
    signUp,
    signOut,
    switchView,
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
