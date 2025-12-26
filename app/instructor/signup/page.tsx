'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { validatePassword } from '@/lib/passwordValidation';
import PasswordStrengthIndicator from '@/components/PasswordStrengthIndicator';
import { instructorSignUpAction } from '@/lib/instructor-auth-actions';

const COUNTRIES = {
  US: { en: 'United States', es: 'Estados Unidos' },
  ES: { en: 'Spain', es: 'España' },
  MX: { en: 'Mexico', es: 'México' },
  AR: { en: 'Argentina', es: 'Argentina' },
  CO: { en: 'Colombia', es: 'Colombia' },
  PE: { en: 'Peru', es: 'Perú' },
  CL: { en: 'Chile', es: 'Chile' },
  EC: { en: 'Ecuador', es: 'Ecuador' },
  VE: { en: 'Venezuela', es: 'Venezuela' },
  BR: { en: 'Brazil', es: 'Brasil' },
  FR: { en: 'France', es: 'Francia' },
  DE: { en: 'Germany', es: 'Alemania' },
  GB: { en: 'United Kingdom', es: 'Reino Unido' },
  IT: { en: 'Italy', es: 'Italia' },
  CA: { en: 'Canada', es: 'Canadá' },
};

export default function InstructorSignupPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [country, setCountry] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { t, language } = useLanguage();
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      setError(t('signup.passwordError'));
      return;
    }

    setLoading(true);

    try {
      const result = await instructorSignUpAction(
        email,
        password,
        firstName,
        lastName,
        dateOfBirth,
        country
      );

      if (!result.success) {
        setError(result.error || 'Signup failed');
        setLoading(false);
        return;
      }

      // Account created successfully, redirect to login
      setSuccess(true);
      setTimeout(() => {
        router.push('/instructor/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'An error occurred during signup');
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
          <Link href="/" className="flex justify-center mb-6">
            <svg className="w-8 h-8 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </Link>
          <h2 className="mt-6 text-center text-4xl font-black text-gray-900 uppercase tracking-tight">
            {t('signup.title')}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {t('home.instructorPortal')}
          </p>
        </div>
        <form className="mt-8 space-y-6 bg-white p-8 rounded-lg border border-gray-200 shadow-sm" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 border border-red-500 p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="first-name" className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  {t('signup.firstNameLabel')}
                </label>
                <input
                  id="first-name"
                  name="firstName"
                  type="text"
                  required
                  className="appearance-none relative block w-full px-4 py-3 border border-gray-200 bg-gray-100 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
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
                  className="appearance-none relative block w-full px-4 py-3 border border-gray-200 bg-gray-100 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
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
                className="appearance-none relative block w-full px-4 py-3 border border-gray-200 bg-gray-100 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
                placeholder={t('signup.emailPlaceholder')}
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

            <div>
              <label htmlFor="country" className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                {t('profile.country')}
              </label>
              <select
                id="country"
                name="country"
                required
                className="appearance-none relative block w-full px-4 py-3 border border-gray-200 bg-gray-100 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              >
                <option value="">{t('profile.selectCountry')}</option>
                {Object.entries(COUNTRIES).map(([code, names]) => (
                  <option key={code} value={code}>
                    {names[language as 'en' | 'es']}
                  </option>
                ))}
              </select>
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
                className="appearance-none relative block w-full px-4 py-3 border border-gray-200 bg-gray-100 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
                placeholder={t('signup.passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <PasswordStrengthIndicator password={password} />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-[#10b981] hover:bg-[#059669] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#10b981] uppercase tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('signup.creatingAccount') : t('signup.signUpButton')}
            </button>
          </div>

          <div className="text-center">
            <Link
              href="/instructor/login"
              className="font-medium text-sm text-[#10b981] hover:text-[#059669] transition-colors"
            >
              {t('signup.haveAccount')}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
