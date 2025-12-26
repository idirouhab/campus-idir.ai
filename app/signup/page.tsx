'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

export default function SignupSelectionPage() {
  const { t } = useLanguage();
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-2xl w-full animate-fade-in-up">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-3">
            {t('auth.createAccountAs')}
          </h1>
          <p className="text-gray-600">
            {t('auth.selectUserTypeDescription')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Student Option */}
          <Link
            href="/student/signup"
            className="group bg-white border-2 border-gray-200 rounded-lg p-8 text-center hover:border-[#10b981] transition-all shadow-sm hover:shadow-md"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-all">
              <svg className="w-10 h-10 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              {t('home.studentPortal')}
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              {t('home.studentDescription')}
            </p>
            <div className="px-6 py-3 bg-[#10b981] text-white text-sm font-bold rounded-lg group-hover:bg-[#059669] transition-all uppercase tracking-wide inline-block">
              {t('common.signUp')}
            </div>
          </Link>

          {/* Instructor Option */}
          <Link
            href="/instructor/signup"
            className="group bg-white border-2 border-gray-200 rounded-lg p-8 text-center hover:border-[#10b981] transition-all shadow-sm hover:shadow-md"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-all">
              <svg className="w-10 h-10 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              {t('home.instructorPortal')}
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              {t('home.instructorDescription')}
            </p>
            <div className="px-6 py-3 bg-[#10b981] text-white text-sm font-bold rounded-lg group-hover:bg-[#059669] transition-all uppercase tracking-wide inline-block">
              {t('common.signUp')}
            </div>
          </Link>
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            {t('auth.alreadyHaveAccount')}{' '}
            <Link href="/login" className="text-[#10b981] hover:text-[#059669] font-bold">
              {t('common.signIn')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
