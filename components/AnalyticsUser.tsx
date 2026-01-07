'use client';

import { useEffect, useRef } from 'react';
import { setUserId, isGAEnabled } from '@/lib/gtag';

interface AnalyticsUserProps {
  userId?: string | null;
}

export function AnalyticsUser({ userId }: AnalyticsUserProps) {
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isGAEnabled) return;

    // Only update if userId changes and is valid
    if (userId && userId !== lastUserIdRef.current) {
      setUserId(userId);
      lastUserIdRef.current = userId;
    }
  }, [userId]);

  return null;
}
