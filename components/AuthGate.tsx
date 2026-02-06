'use client';

import type { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Navigation from '@/components/Navigation';

export default function AuthGate({ children }: { children: ReactNode }) {
  const { initialCheckDone } = useAuth();

  if (!initialCheckDone) {
    return (
      <>
        <div className="fixed top-0 left-0 right-0 z-50 h-16 backdrop-blur-xl border-b border-gray-200 bg-white/95">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
            <div className="h-6 w-28 bg-gray-200 rounded animate-pulse" />
            <div className="hidden md:flex items-center gap-3">
              <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
              <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        </div>
        <div className="min-h-screen pt-16 bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="h-2 w-40 bg-gray-200 rounded-full animate-pulse mx-auto" />
            <p className="mt-4 text-sm text-gray-500">Checking your session...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      {children}
    </>
  );
}
