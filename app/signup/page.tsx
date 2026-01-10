'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { validatePassword } from '@/lib/passwordValidation';
import PasswordStrengthIndicator from '@/components/PasswordStrengthIndicator';
import { COMMON_TIMEZONES } from '@/lib/timezone-utils';
import { LoadingButton } from '@/components/ui/LoadingButton';
import { Spinner } from '@/components/ui/Spinner';
import { useFormSubmit } from '@/hooks/useFormSubmit';
import { useNavigationState } from '@/hooks/useNavigationPending';

export default function SignupPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [timezone, setTimezone] = useState('Euope/Madrid');
  const { signUp, user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const { navigate, isNavigating } = useNavigationState();

  // Form submission with immediate feedback
  const { isSubmitting, error, success, setError, handleSubmit } = useFormSubmit({
    onSubmit: async () => {
      // Validate password
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        return { error: t('signup.passwordError') };
      }

      const { error } = await signUp(email, password, firstName, lastName, dateOfBirth, timezone);

      if (error) {
        return { error: error.message };
      }

      return { success: true };
    },
    onSuccess: () => {
      // Account created successfully, redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    },
  });

  // Check if already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      // Already logged in, redirect to dashboard
      navigate('/dashboard');
    }
  }, [user, authLoading, navigate]);

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

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="rounded-lg bg-emerald-50 border border-[#10b981] p-6 text-center animate-scale-in shadow-sm">
            <div className="w-16 h-16 bg-[#10b981] rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-lg font-bold text-[#10b981] uppercase tracking-wide mb-2">
              {t('signup.accountCreated')}
            </p>
            <p className="text-sm text-gray-600">
              {t('signup.accountCreatedMessage')}
            </p>
            <p className="text-xs text-gray-500 mt-4">
              {t('signup.redirecting')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 animate-fade-in-up">
        <div>
          <h2 className="mt-6 text-center text-4xl font-black text-gray-900 uppercase tracking-tight">
            {t('signup.title')}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {t('signup.subtitle')}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="first-name" className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  {t('signup.firstNameLabel')}
                </label>
                <input
                  id="first-name"
                  name="firstName"
                  type="text"
                  required
                  disabled={isSubmitting}
                  className="appearance-none relative block w-full px-4 py-3 border border-gray-200 bg-gray-100 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent text-base disabled:opacity-60 disabled:cursor-not-allowed"
                  placeholder={t('signup.firstNamePlaceholder')}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="last-name" className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  {t('signup.lastNameLabel')}
                </label>
                <input
                  id="last-name"
                  name="lastName"
                  type="text"
                  required
                  disabled={isSubmitting}
                  className="appearance-none relative block w-full px-4 py-3 border border-gray-200 bg-gray-100 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent text-base disabled:opacity-60 disabled:cursor-not-allowed"
                  placeholder={t('signup.lastNamePlaceholder')}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label htmlFor="email-address" className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                {t('signup.emailLabel')}
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled={isSubmitting}
                className="appearance-none relative block w-full px-4 py-3 border border-gray-200 bg-gray-100 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
                placeholder={t('signup.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                {t('signup.passwordLabel')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                disabled={isSubmitting}
                className="appearance-none relative block w-full px-4 py-3 border border-gray-200 bg-gray-100 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
                placeholder={t('signup.passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <PasswordStrengthIndicator password={password} />
            </div>
            <div>
              <label htmlFor="date-of-birth" className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                Date of Birth
              </label>
              <input
                id="date-of-birth"
                name="dateOfBirth"
                type="date"
                required
                disabled={isSubmitting}
                className="appearance-none relative block w-full px-4 py-3 border border-gray-200 bg-gray-100 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <label htmlFor="timezone" className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                Timezone
              </label>
              <select
                id="timezone"
                name="timezone"
                required
                disabled={isSubmitting}
                className="appearance-none relative block w-full px-4 py-3 border border-gray-200 bg-gray-100 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              >
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <LoadingButton
              type="submit"
              loading={isSubmitting}
              loadingText={t('signup.creatingAccount')}
              variant="primary"
              size="md"
              fullWidth
            >
              {t('signup.signUpButton')}
            </LoadingButton>
          </div>

          <div className="text-center">
            <Link
              href="/login"
              className="font-bold text-[#10b981] hover:text-[#059669] transition-colors"
            >
              {t('signup.haveAccount')}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
