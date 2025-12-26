'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { verifyInstructorAction } from '@/lib/instructor-auth-actions';
import { getInstructorCoursesAction, deleteCourseAction } from '@/lib/course-actions';
import { Instructor, Course } from '@/types/database';
import { useInstructorPermissions } from '@/hooks/useInstructorPermissions';
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
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);
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

  // Handle course deletion
  const handleDeleteCourse = async (courseId: string, courseTitle: string) => {
    if (!instructor) return;

    if (!confirm(`Are you sure you want to delete "${courseTitle}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingCourseId(courseId);
    try {
      const result = await deleteCourseAction(instructor.id, courseId);
      if (result.success) {
        // Remove the course from the list
        setCourses(courses.filter(course => course.id !== courseId));
      } else {
        alert(result.error || 'Failed to delete course');
      }
    } catch (error: any) {
      console.error('Error deleting course:', error);
      alert(error.message || 'Failed to delete course');
    } finally {
      setDeletingCourseId(null);
    }
  };

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
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-gray-900">
                {permissions.canViewAllCourses() ? 'All Courses' : 'My Courses'}
              </h2>
              {permissions.canCreateCourses() && (
                <Link
                  href="/instructor/dashboard/courses/new"
                  className="px-4 py-2 bg-[#10b981] text-white text-sm font-bold rounded-lg hover:bg-[#059669] transition-all uppercase tracking-wide flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Course
                </Link>
              )}
            </div>
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
                <div key={course.id} className="relative border border-gray-200 rounded-lg overflow-hidden group">
                  <Link
                    href={`/course/${course.slug}`}
                    className="block hover:border-[#10b981] transition-all"
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

                      <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
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
                  {/* Action Buttons */}
                  <div className="px-4 pb-4 pt-0 border-t border-gray-100">
                    <Link
                      href={`/instructor/dashboard/courses/${course.id}/students`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center justify-center gap-2 w-full px-3 py-2 text-xs font-bold rounded-lg text-[#10b981] bg-emerald-50 hover:bg-emerald-100 transition-all uppercase tracking-wide"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>

                      View Students ({course.enrollment_count || 0})
                    </Link>
                  </div>

                  {/* Delete Button - Only for admins */}
                  {permissions.canCreateCourses() && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleDeleteCourse(course.id, course.title);
                      }}
                      disabled={deletingCourseId === course.id}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg z-10"
                      title="Delete course"
                    >
                      {deletingCourseId === course.id ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
