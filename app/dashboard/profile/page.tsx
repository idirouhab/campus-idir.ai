'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { updateStudentProfileAction, updateStudentPasswordAction } from '@/lib/auth-actions';
import { validatePassword } from '@/lib/passwordValidation';
import PasswordStrengthIndicator from '@/components/PasswordStrengthIndicator';
import { LoadingButton } from '@/components/ui/LoadingButton';
import { Spinner } from '@/components/ui/Spinner';
import { useFormSubmit } from '@/hooks/useFormSubmit';
import { useNavigationState } from '@/hooks/useNavigationPending';

export default function StudentProfilePage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const { t } = useLanguage();
  const { navigate } = useNavigationState();

  // Profile form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Profile form submission
  const profileForm = useFormSubmit({
    onSubmit: async () => {
      if (!firstName || !lastName || !email || !dateOfBirth) {
        return { error: 'All fields are required' };
      }

      const result = await updateStudentProfileAction(user!.id, firstName, lastName, email, dateOfBirth);

      if (!result.success) {
        return { error: result.error || 'Failed to update profile' };
      }

      await refreshUser();
      return { success: true };
    },
  });

  // Password form submission
  const passwordForm = useFormSubmit({
    onSubmit: async () => {
      if (!currentPassword || !newPassword || !confirmPassword) {
        return { error: 'All fields are required' };
      }

      if (newPassword !== confirmPassword) {
        return { error: t('profile.passwordMismatch') };
      }

      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        return { error: t('signup.passwordError') };
      }

      const result = await updateStudentPasswordAction(user!.id, currentPassword, newPassword);

      if (!result.success) {
        return { error: result.error || 'Failed to update password' };
      }

      // Clear password fields on success
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      return { success: true };
    },
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/student/login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name);
      setLastName(user.last_name);
      setEmail(user.email);
      // Format date properly for input type="date" (YYYY-MM-DD)
      if (user.birthday) {
        const dateObj = typeof user.birthday === 'string'
          ? new Date(user.birthday)
          : user.birthday;
        const birthDate = dateObj.toISOString().split('T')[0];
        setDateOfBirth(birthDate);
      }
    }
  }, [user]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-8">
        {/* Back Button */}
        <Link
          href="/dashboard"
          className="inline-flex items-center text-[#10b981] hover:text-[#059669] font-semibold text-sm transition-colors mb-4"
        >
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {t('course.backToDashboard')}
        </Link>

        {/* Page Title */}
        <div className="mb-6 md:mb-8 animate-fade-in-up">
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
            {t('profile.title')}
          </h1>
        </div>

        {/* Profile Information Section */}
        <div className="bg-white rounded-lg border border-gray-200 emerald-accent-left p-6 mb-6 animate-fade-in shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">{t('profile.personalInfo')}</h2>
            <p className="text-sm text-gray-600">{t('profile.personalInfoDescription')}</p>
          </div>

          <form onSubmit={profileForm.handleSubmit} className="space-y-4" aria-busy={profileForm.isSubmitting}>
            {profileForm.error && (
              <div className="rounded-md bg-red-50 border border-red-500 p-4">
                <p className="text-sm text-red-600">{profileForm.error}</p>
              </div>
            )}

            {profileForm.success && (
              <div className="rounded-md bg-emerald-50 border border-[#10b981] p-4">
                <p className="text-sm text-[#10b981] font-semibold">{t('profile.profileUpdated')}</p>
                <p className="text-xs text-gray-600 mt-1">{t('profile.profileUpdatedMessage')}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="first-name" className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  {t('profile.firstName')}
                </label>
                <input
                  id="first-name"
                  name="firstName"
                  type="text"
                  required
                  disabled={profileForm.isSubmitting}
                  className="appearance-none relative block w-full px-4 py-3 border border-gray-200 bg-gray-100 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="last-name" className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  {t('profile.lastName')}
                </label>
                <input
                  id="last-name"
                  name="lastName"
                  type="text"
                  required
                  disabled={profileForm.isSubmitting}
                  className="appearance-none relative block w-full px-4 py-3 border border-gray-200 bg-gray-100 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="email-address" className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                {t('profile.email')}
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled={profileForm.isSubmitting}
                className="appearance-none relative block w-full px-4 py-3 border border-gray-200 bg-gray-100 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="date-of-birth" className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                {t('profile.dateOfBirth')}
              </label>
              <input
                id="date-of-birth"
                name="dateOfBirth"
                type="date"
                required
                disabled={profileForm.isSubmitting}
                max={new Date().toISOString().split('T')[0]}
                className="appearance-none relative block w-full px-4 py-3 border border-gray-200 bg-gray-100 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
              />
            </div>

            <div className="pt-2">
              <LoadingButton
                type="submit"
                loading={profileForm.isSubmitting}
                loadingText={t('profile.savingChanges')}
                variant="primary"
                size="md"
              >
                {t('profile.saveChanges')}
              </LoadingButton>
            </div>
          </form>
        </div>

        {/* Security Section */}
        <div className="bg-white rounded-lg border border-gray-200 emerald-accent-left p-6 animate-fade-in shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">{t('profile.security')}</h2>
            <p className="text-sm text-gray-600">{t('profile.securityDescription')}</p>
          </div>

          <form onSubmit={passwordForm.handleSubmit} className="space-y-4" aria-busy={passwordForm.isSubmitting}>
            {passwordForm.error && (
              <div className="rounded-md bg-red-50 border border-red-500 p-4">
                <p className="text-sm text-red-600">{passwordForm.error}</p>
              </div>
            )}

            {passwordForm.success && (
              <div className="rounded-md bg-emerald-50 border border-[#10b981] p-4">
                <p className="text-sm text-[#10b981] font-semibold">{t('profile.passwordUpdated')}</p>
                <p className="text-xs text-gray-600 mt-1">{t('profile.passwordUpdatedMessage')}</p>
              </div>
            )}

            <div>
              <label htmlFor="current-password" className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                {t('profile.currentPassword')}
              </label>
              <input
                id="current-password"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
                disabled={passwordForm.isSubmitting}
                className="appearance-none relative block w-full px-4 py-3 border border-gray-200 bg-gray-100 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="new-password" className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                {t('profile.newPassword')}
              </label>
              <input
                id="new-password"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                required
                disabled={passwordForm.isSubmitting}
                className="appearance-none relative block w-full px-4 py-3 border border-gray-200 bg-gray-100 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <PasswordStrengthIndicator password={newPassword} />
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                {t('profile.confirmPassword')}
              </label>
              <input
                id="confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                disabled={passwordForm.isSubmitting}
                className="appearance-none relative block w-full px-4 py-3 border border-gray-200 bg-gray-100 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <div className="pt-2">
              <LoadingButton
                type="submit"
                loading={passwordForm.isSubmitting}
                loadingText={t('profile.changingPassword')}
                variant="primary"
                size="md"
              >
                {t('profile.changePassword')}
              </LoadingButton>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
