'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { requestPasswordResetAction } from '@/lib/password-reset-actions';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const { t, language } = useLanguage();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Map language code to locale
      const locale = language === 'es' ? 'es-ES' : 'en-US';
      const result = await requestPasswordResetAction(email, locale);

      if (!result.success && result.error) {
        setError(result.error);
      } else {
        // Always show success for security (don't reveal if email exists)
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

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
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <p className="text-lg font-bold text-[#10b981] uppercase tracking-wide mb-2">
              {t('resetPassword.checkEmailTitle')}
            </p>
            <p className="text-sm text-gray-600 mb-4">
              {t('resetPassword.checkEmailMessage').replace('{email}', email)}
            </p>
            <p className="text-xs text-gray-500">
              {t('resetPassword.linkExpiry')}
            </p>
            <Link
              href="/login"
              className="inline-block mt-6 font-bold text-[#10b981] hover:text-[#059669] transition-colors"
            >
              {t('resetPassword.backToLogin')}
            </Link>
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
            {t('resetPassword.title')}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {t('resetPassword.subtitle')}
          </p>
        </div>
        <form className="mt-8 space-y-6 bg-white p-8 rounded-lg border border-gray-200 shadow-sm" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 border border-red-500 p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

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
              className="appearance-none relative block w-full px-4 py-3 border border-gray-200 bg-gray-100 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
              placeholder={t('login.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-[#10b981] hover:bg-[#059669] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#10b981] disabled:opacity-50 transition-all uppercase tracking-wide"
            >
              {loading ? t('resetPassword.sending') : t('resetPassword.sendButton')}
            </button>
          </div>

          <div className="text-center space-y-2">
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
