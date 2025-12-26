'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Link from 'next/link';

export default function Home() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#10b981] mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center animate-fade-in-up">
        {/* Logo/Title */}
        <div className="mb-12">
          <h1 className="text-6xl font-black text-gray-900 mb-4 tracking-tight leading-tight">
            {t('home.title')}
          </h1>
          <p className="text-gray-600 text-lg">
            {t('home.subtitle')}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <Link
            href="/login"
            className="block w-full px-8 py-4 bg-[#10b981] text-white text-lg font-bold rounded-lg hover:bg-[#059669] transition-all uppercase tracking-wide shadow-sm"
          >
            {t('home.signInButton')}
          </Link>
          <Link
            href="/signup"
            className="block w-full px-8 py-4 bg-white text-[#10b981] text-lg font-bold rounded-lg hover:bg-gray-50 transition-all border-2 border-[#10b981] uppercase tracking-wide"
          >
            {t('home.signUpButton')}
          </Link>
        </div>

        {/* Help text */}
        <p className="mt-8 text-sm text-gray-500">
          {t('home.helpText')}
        </p>
      </div>
    </div>
  );
}
