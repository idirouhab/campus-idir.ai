'use client';

import { useState, FormEvent, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { LoadingButton } from '@/components/ui/LoadingButton';
import { Spinner } from '@/components/ui/Spinner';
import { useFormSubmit } from '@/hooks/useFormSubmit';
import { useNavigationState } from '@/hooks/useNavigationPending';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn, user, loading: authLoading, currentView, hasInstructorProfile } = useAuth();
  const { t } = useLanguage();
  const { navigate, isNavigating } = useNavigationState();

  // Form submission with immediate feedback
  const { isSubmitting, error, setError, handleSubmit } = useFormSubmit({
    onSubmit: async () => {
      const { error } = await signIn(email, password);
      if (error) {
        return { error: error.message };
      }
      return { success: true };
    },
    onSuccess: () => {
      // Navigate with loading state
      if (currentView === 'instructor' && hasInstructorProfile) {
        navigate('/instructor/dashboard');
      } else {
        navigate('/dashboard');
      }
    },
  });

  // Check if already authenticated and redirect based on their current view
  useEffect(() => {
    if (!authLoading && user) {
      // Middleware will handle the redirect based on JWT currentView
      if (currentView === 'instructor' && hasInstructorProfile) {
        navigate('/instructor/dashboard');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, authLoading, currentView, hasInstructorProfile, navigate]);

  // Show loading while checking auth
  if (authLoading || isNavigating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 animate-fade-in-up">
        <div>
          <h2 className="mt-6 text-center text-4xl font-black text-gray-900 uppercase tracking-tight">
            {t('login.title')}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {t('login.subtitle')}
          </p>
        </div>
        <form
          className="mt-8 space-y-6 bg-white p-8 rounded-lg border border-gray-200 shadow-sm"
          onSubmit={handleSubmit}
          aria-busy={isSubmitting}
        >
          {error && (
            <div className="rounded-md bg-red-50 border border-red-500 p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label htmlFor="email-address" className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                {t('login.emailLabel')}
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled={isSubmitting}
                className="appearance-none relative block w-full px-4 py-3 border border-gray-200 bg-gray-100 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
                placeholder={t('login.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                {t('login.passwordLabel')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                disabled={isSubmitting}
                className="appearance-none relative block w-full px-4 py-3 border border-gray-200 bg-gray-100 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
                placeholder={t('login.passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <div className="text-right mt-2">
                <Link
                  href="/reset-password"
                  className="text-sm font-medium text-[#10b981] hover:text-[#059669] transition-colors"
                >
                  {t('login.forgotPassword')}
                </Link>
              </div>
            </div>
          </div>

          <div>
            <LoadingButton
              type="submit"
              loading={isSubmitting}
              loadingText={t('login.signingIn')}
              variant="primary"
              size="md"
              fullWidth
            >
              {t('login.signInButton')}
            </LoadingButton>
          </div>

          <div className="text-center">
            <Link
              href="/signup"
              className="font-bold text-[#10b981] hover:text-[#059669] transition-colors"
            >
              {t('login.noAccount')}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
