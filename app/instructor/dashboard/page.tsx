'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { verifyInstructorAction } from '@/lib/instructor-auth-actions';
import { getInstructorCoursesAction } from '@/lib/course-actions';
import { Instructor, Course } from '@/types/database';
import { useInstructorPermissions } from '@/hooks/useInstructorPermissions';
import InstructorNavigation from '@/components/InstructorNavigation';
import Cookies from 'js-cookie';

interface CourseWithInstructors extends Course {
  instructors?: Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    picture_url?: string;
    instructor_role: string;
    display_order: number;
  }>;
}

export default function InstructorDashboardPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [instructor, setInstructor] = useState<Instructor | null>(null);
  const [courses, setCourses] = useState<CourseWithInstructors[]>([]);
  const [loading, setLoading] = useState(true);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const permissions = useInstructorPermissions(instructor);

  useEffect(() => {
    const checkAuth = async () => {
      const instructorId = Cookies.get('instructorId');
      const userType = Cookies.get('userType');

      if (!instructorId || userType !== 'instructor') {
        router.push('/instructor/login');
        return;
      }

      try {
        const result = await verifyInstructorAction(instructorId);
        if (result.success && result.data) {
          setInstructor(result.data);
        } else {
          Cookies.remove('instructorId');
          Cookies.remove('userType');
          router.push('/instructor/login');
        }
      } catch (error) {
        console.error('Auth error:', error);
        router.push('/instructor/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  // Fetch courses when instructor is loaded
  useEffect(() => {
    const fetchCourses = async () => {
      if (!instructor) return;

      setCoursesLoading(true);
      try {
        const result = await getInstructorCoursesAction(instructor.id);
        if (result.success && result.data) {
          setCourses(result.data);
        }
      } catch (error) {
        console.error('Error fetching courses:', error);
      } finally {
        setCoursesLoading(false);
      }
    };

    fetchCourses();
  }, [instructor]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#10b981] mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!instructor) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <InstructorNavigation />
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-8">
        <div className="mb-6 md:mb-8 animate-fade-in-up">
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
            {t('dashboard.title')} <span className="text-[#10b981]">{t('dashboard.dashboardTitle')}</span>
          </h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">
            {t('dashboard.welcomeBack')}
          </p>
        </div>

        {/* Courses Section */}
        <div className="bg-white rounded-lg border border-gray-200 emerald-accent-left p-6 shadow-sm mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              {permissions.canViewAllCourses() ? 'All Courses' : 'My Courses'}
            </h2>
            <span className="text-sm text-gray-600">
              {courses.length} {courses.length === 1 ? 'course' : 'courses'}
            </span>
          </div>

          {coursesLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#10b981]"></div>
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <p className="text-gray-600 font-semibold">No courses yet</p>
              <p className="text-sm text-gray-500 mt-1">
                {permissions.canViewAllCourses()
                  ? 'No courses have been created yet.'
                  : 'You have not been assigned to any courses yet.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map((course) => (
                <Link
                  key={course.id}
                  href={`/course/${course.slug}`}
                  className="block border border-gray-200 rounded-lg hover:border-[#10b981] transition-all overflow-hidden group"
                >
                  {course.cover_image && (
                    <div className="aspect-video bg-gray-100 overflow-hidden">
                      <img
                        src={course.cover_image}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">{course.title}</h3>
                    {course.short_description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{course.short_description}</p>
                    )}

                    {/* Instructors */}
                    {course.instructors && course.instructors.length > 0 && (
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex -space-x-2">
                          {course.instructors.slice(0, 3).map((inst) => (
                            <div
                              key={inst.id}
                              className="w-6 h-6 rounded-full bg-emerald-50 border-2 border-white flex items-center justify-center"
                              title={`${inst.first_name} ${inst.last_name}`}
                            >
                              {inst.picture_url ? (
                                <img
                                  src={inst.picture_url}
                                  alt={inst.first_name}
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                <span className="text-xs font-semibold text-[#10b981]">
                                  {inst.first_name[0]}{inst.last_name[0]}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                        <span className="text-xs text-gray-500">
                          {course.instructors.length} {course.instructors.length === 1 ? 'instructor' : 'instructors'}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className={`px-2 py-1 rounded ${
                        course.status === 'published'
                          ? 'bg-emerald-50 text-[#10b981]'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {course.status}
                      </span>
                      <span>{course.language.toUpperCase()}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
