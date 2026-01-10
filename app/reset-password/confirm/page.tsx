'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { validatePassword } from '@/lib/passwordValidation';
import PasswordStrengthIndicator from '@/components/PasswordStrengthIndicator';
import { verifyResetTokenAction, resetPasswordAction } from '@/lib/password-reset-actions';
import { LoadingButton } from '@/components/ui/LoadingButton';
import { Spinner } from '@/components/ui/Spinner';
import { useFormSubmit } from '@/hooks/useFormSubmit';
import { useNavigationState } from '@/hooks/useNavigationPending';

function ResetPasswordConfirmContent() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verifying, setVerifying] = useState(true);
  const [tokenError, setTokenError] = useState('');
  const { t, setLanguage } = useLanguage();
  const { navigate } = useNavigationState();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const localeParam = searchParams.get('locale');

  // Form submission hook
  const { isSubmitting, error, success, setError, handleSubmit } = useFormSubmit({
    onSubmit: async () => {
      // Validate password
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        return { error: t('resetPassword.passwordRequirementsError') };
      }

      // Check if passwords match
      if (password !== confirmPassword) {
        return { error: t('resetPassword.passwordsDoNotMatch') };
      }

      if (!token) {
        return { error: t('resetPassword.invalidResetLink') };
      }

      const result = await resetPasswordAction(token, password);

      if (!result.success) {
        return { error: result.error || 'Failed to reset password' };
      }

      return { success: true };
    },
    onSuccess: () => {
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    },
    resetOnSuccess: false,
  });

  // Set language from URL parameter
  useEffect(() => {
    if (localeParam) {
      const lang = localeParam.startsWith('es') ? 'es' : 'en';
      setLanguage(lang as 'en' | 'es');
    }
  }, [localeParam, setLanguage]);

  // Verify token on mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setTokenError(t('resetPassword.invalidResetLink'));
        setVerifying(false);
        return;
      }

      const result = await verifyResetTokenAction(token);
      if (!result.valid) {
        setTokenError(result.error || t('resetPassword.invalidResetLink'));
      }
      setVerifying(false);
    };

    verifyToken();
  }, [token, t]);

  // Show loading while verifying token
  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">{t('resetPassword.verifyingLink')}</p>
        </div>
      </div>
    );
  }

  // Show error if token is invalid
  if (tokenError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="rounded-lg bg-red-50 border border-red-500 p-6 text-center">
            <div className="w-16 h-16 bg-red-500 rounded-lg flex items-center justify-center mx-auto mb-4">
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <p className="text-lg font-bold text-red-600 uppercase tracking-wide mb-2">
              {t('resetPassword.invalidLinkTitle')}
            </p>
            <p className="text-sm text-gray-600 mb-4">
              {tokenError}
            </p>
            <div className="space-y-2">
              <Link
                href="/reset-password"
                className="inline-block font-bold text-red-600 hover:text-red-700 transition-colors"
              >
                {t('resetPassword.requestNewLink')}
              </Link>
              <br />
              <Link
                href="/login"
                className="inline-block font-bold text-gray-600 hover:text-gray-700 transition-colors"
              >
                {t('resetPassword.backToLogin')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show success message
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
              {t('resetPassword.successTitle')}
            </p>
            <p className="text-sm text-gray-600 mb-4">
              {t('resetPassword.successMessage')}
            </p>
            <p className="text-xs text-gray-500">
              {t('resetPassword.redirecting')}
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
            {t('resetPassword.confirmTitle')}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {t('resetPassword.confirmSubtitle')}
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

          <div>
            <label htmlFor="password" className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
              {t('resetPassword.newPasswordLabel')}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              disabled={isSubmitting}
              className="appearance-none relative block w-full px-4 py-3 border border-gray-200 bg-gray-100 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
              placeholder={t('login.passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <PasswordStrengthIndicator password={password} />
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
              {t('resetPassword.confirmPasswordLabel')}
            </label>
            <input
              id="confirm-password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              disabled={isSubmitting}
              className="appearance-none relative block w-full px-4 py-3 border border-gray-200 bg-gray-100 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
              placeholder={t('login.passwordPlaceholder')}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <div>
            <LoadingButton
              type="submit"
              loading={isSubmitting}
              loadingText={t('resetPassword.resetting')}
              variant="primary"
              size="md"
              fullWidth
            >
              {t('resetPassword.resetButton')}
            </LoadingButton>
          </div>

          <div className="text-center">
            <Link
              href="/login"
              className="font-bold text-[#10b981] hover:text-[#059669] transition-colors"
            >
              {t('resetPassword.backToLogin')}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordConfirmPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <ResetPasswordConfirmContent />
    </Suspense>
  );
}
