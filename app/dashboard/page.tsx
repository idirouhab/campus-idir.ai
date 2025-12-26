'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useStudentCourses } from '@/hooks/useCourses';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  console.log('[Dashboard] User object:', user);
  console.log('[Dashboard] User ID:', user?.id);

  const { courses, loading: coursesLoading } = useStudentCourses(user?.id);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || coursesLoading) {
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
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-8">
        {/* Page Title - Compact */}
        <div className="mb-6 md:mb-8 animate-fade-in-up">
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
            {t('dashboard.title')} <span className="text-[#10b981]">{t('dashboard.titleHighlight')}</span>
          </h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">
            {t('dashboard.welcomeBack')} <span className="text-[#10b981] font-semibold">{user.first_name} {user.last_name}</span>
          </p>
        </div>
        {courses.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 md:p-12 text-center animate-fade-in shadow-sm">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-emerald-50 rounded-lg flex items-center justify-center mx-auto mb-4 md:mb-6">
              <svg
                className="w-8 h-8 md:w-10 md:h-10 text-[#10b981]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2 md:mb-3 uppercase tracking-wide">
              {t('dashboard.noCourses')}
            </h2>
            <p className="text-sm md:text-base text-gray-600 max-w-md mx-auto">
              {t('dashboard.noCoursesDescription')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 animate-fade-in">
            {courses.map(({ course }) => (
              <Link
                key={course.id}
                href={`/course/${course.slug}`}
                className="group bg-white rounded-lg border border-gray-200 hover:border-[#10b981] transition-all overflow-hidden card-hover emerald-accent-left shadow-sm hover:shadow-md"
              >
                {course.cover_image ? (
                  <div className="h-48 bg-gray-100 overflow-hidden">
                    <img
                      src={course.cover_image}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div className="h-48 bg-gray-100 flex items-center justify-center">
                    <svg
                      className="w-16 h-16 text-[#10b981]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                      />
                    </svg>
                  </div>
                )}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center px-3 py-1 rounded text-xs font-bold bg-emerald-50 text-[#10b981] uppercase tracking-wide border border-emerald-100">
                      {course.language}
                    </span>
                    <span className="text-xs text-gray-500 font-bold uppercase">
                      {course.status}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-[#10b981] transition-colors">
                    {course.title}
                  </h3>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-4 leading-relaxed">
                    {course.short_description || course.meta_description || 'No description available'}
                  </p>
                  <div className="flex items-center text-[#10b981] text-sm font-bold uppercase tracking-wide group-hover:text-[#059669] transition-colors">
                    {t('dashboard.accessCourse')}
                    <svg
                      className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
