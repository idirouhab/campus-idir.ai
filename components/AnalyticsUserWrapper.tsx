'use client';

import { useAuth } from '@/contexts/AuthContext';
import { AnalyticsUser } from './AnalyticsUser';

/**
 * Wrapper component that automatically binds the authenticated user's ID to Google Analytics.
 * This component should be placed inside the AuthProvider to access the user context.
 */
export function AnalyticsUserWrapper() {
  const { user } = useAuth();

  return <AnalyticsUser userId={user?.id} />;
}
