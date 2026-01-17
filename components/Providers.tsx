'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { QueryProvider } from '@/contexts/QueryProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <LanguageProvider>
        <AuthProvider>{children}</AuthProvider>
      </LanguageProvider>
    </QueryProvider>
  );
}
