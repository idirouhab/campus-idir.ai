'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { updateStudentProfileAction, updateStudentPasswordAction } from '@/lib/auth-actions';
import { validatePassword } from '@/lib/passwordValidation';
import PasswordStrengthIndicator from '@/components/PasswordStrengthIndicator';

export default function StudentProfilePage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  // Profile form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/student/login');
    }
  }, [user, authLoading, router]);

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

  const handleProfileSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess(false);

    if (!firstName || !lastName || !email || !dateOfBirth) {
      setProfileError('All fields are required');
      return;
    }

    setProfileLoading(true);

    try {
      const result = await updateStudentProfileAction(user!.id, firstName, lastName, email, dateOfBirth);

      if (!result.success) {
        setProfileError(result.error || 'Failed to update profile');
        setProfileLoading(false);
        return;
      }

      setProfileSuccess(true);
      await refreshUser();

      setTimeout(() => {
        setProfileSuccess(false);
      }, 3000);

      setProfileLoading(false);
    } catch (err: any) {
      setProfileError(err.message || 'An error occurred');
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All fields are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(t('profile.passwordMismatch'));
      return;
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      setPasswordError(t('signup.passwordError'));
      return;
    }

    setPasswordLoading(true);

    try {
      const result = await updateStudentPasswordAction(user!.id, currentPassword, newPassword);

      if (!result.success) {
        setPasswordError(result.error || 'Failed to update password');
        setPasswordLoading(false);
        return;
      }

      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        setPasswordSuccess(false);
      }, 3000);

      setPasswordLoading(false);
    } catch (err: any) {
      setPasswordError(err.message || 'An error occurred');
      setPasswordLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#10b981] mx-auto"></div>
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

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            {profileError && (
              <div className="rounded-md bg-red-50 border border-red-500 p-4">
                <p className="text-sm text-red-600">{profileError}</p>
              </div>
            )}

            {profileSuccess && (
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
                  className="appearance-none relative block w-full px-4 py-3 border border-gray-200 bg-gray-100 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
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
                  className="appearance-none relative block w-full px-4 py-3 border border-gray-200 bg-gray-100 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
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
                className="appearance-none relative block w-full px-4 py-3 border border-gray-200 bg-gray-100 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
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
                max={new Date().toISOString().split('T')[0]}
                className="appearance-none relative block w-full px-4 py-3 border border-gray-200 bg-gray-100 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={profileLoading}
                className="w-full md:w-auto px-6 py-3 border border-transparent text-sm font-bold rounded-lg text-white bg-[#10b981] hover:bg-[#059669] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#10b981] uppercase tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {profileLoading ? t('profile.savingChanges') : t('profile.saveChanges')}
              </button>
            </div>
          </form>
        </div>

        {/* Security Section */}
        <div className="bg-white rounded-lg border border-gray-200 emerald-accent-left p-6 animate-fade-in shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">{t('profile.security')}</h2>
            <p className="text-sm text-gray-600">{t('profile.securityDescription')}</p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {passwordError && (
              <div className="rounded-md bg-red-50 border border-red-500 p-4">
                <p className="text-sm text-red-600">{passwordError}</p>
              </div>
            )}

            {passwordSuccess && (
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
                className="appearance-none relative block w-full px-4 py-3 border border-gray-200 bg-gray-100 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
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
                className="appearance-none relative block w-full px-4 py-3 border border-gray-200 bg-gray-100 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
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
                className="appearance-none relative block w-full px-4 py-3 border border-gray-200 bg-gray-100 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full md:w-auto px-6 py-3 border border-transparent text-sm font-bold rounded-lg text-white bg-[#10b981] hover:bg-[#059669] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#10b981] uppercase tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {passwordLoading ? t('profile.changingPassword') : t('profile.changePassword')}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
