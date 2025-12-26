'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Student } from '@/types/database';
import { signInAction, signUpAction, verifyStudentAction } from '@/lib/auth-actions';

interface AuthContextType {
  user: Student | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in via localStorage
    const checkAuth = async () => {
      const studentDataStr = localStorage.getItem('student');
      console.log('[AuthContext] checkAuth - localStorage data:', studentDataStr ? 'exists' : 'empty');

      if (studentDataStr) {
        try {
          const studentData = JSON.parse(studentDataStr);
          console.log('[AuthContext] Verifying student ID:', studentData.id);

          // Verify the student still exists
          const result = await verifyStudentAction(studentData.id);
          console.log('[AuthContext] Verification result:', result);

          if (result.success && result.data) {
            console.log('[AuthContext] Student verified, setting user');
            setUser(result.data);
          } else {
            // Student not found, clear localStorage
            console.log('[AuthContext] Verification failed, clearing localStorage');
            localStorage.removeItem('student');
            setUser(null);
          }
        } catch (err) {
          console.error('[AuthContext] Error during auth check:', err);
          localStorage.removeItem('student');
          setUser(null);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      // Call server action for sign in
      const result = await signInAction(email, password);

      if (!result.success || !result.data) {
        return { error: { message: result.error || 'Invalid email or password' } };
      }

      const studentData = result.data;

      // Store in localStorage
      localStorage.setItem('student', JSON.stringify(studentData));

      // Update state
      setUser(studentData);

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
        return { error: { message: result.error || 'Signup failed' } };
      }

      // Successfully created - in a production app, you'd send verification email here
      // For now, we'll just return success
      return { error: null };
    } catch (err: any) {
      return { error: { message: err.message || 'Signup failed' } };
    }
  };

  const signOut = async () => {
    // Clear localStorage
    localStorage.removeItem('student');
    // Clear state
    setUser(null);
  };

  const refreshUser = async () => {
    const studentDataStr = localStorage.getItem('student');
    if (studentDataStr) {
      try {
        const studentData = JSON.parse(studentDataStr);
        const result = await verifyStudentAction(studentData.id);

        if (result.success && result.data) {
          // Update localStorage with fresh data
          localStorage.setItem('student', JSON.stringify(result.data));
          setUser(result.data);
        } else {
          localStorage.removeItem('student');
          setUser(null);
        }
      } catch (err) {
        console.error('[AuthContext] Error during refresh:', err);
        localStorage.removeItem('student');
        setUser(null);
      }
    }
  };

  const value = {
    user,
    loading,
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
