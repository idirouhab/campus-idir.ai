'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCourse, useCheckCourseAccess } from '@/hooks/useCourses';
import { useCourseChecklist } from '@/hooks/useChecklist';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import MarkdownContent from '@/components/MarkdownContent';
import Checklist from '@/components/Checklist';
import Cookies from 'js-cookie';
import { verifyInstructorAction } from '@/lib/instructor-auth-actions';
import { getCourseByIdAction, getAllInstructorsAction } from '@/lib/course-actions';
import { Instructor } from '@/types/database';
import { canViewAllCourses } from '@/lib/roles';
import {
  assignInstructorToCourseAction,
  removeInstructorFromCourseAction,
  getCourseInstructorsAction,
} from '@/lib/instructor-assignment-actions';

export default function CoursePage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug as string;

  // Instructor auth state
  const [instructor, setInstructor] = useState<Instructor | null>(null);
  const [instructorLoading, setInstructorLoading] = useState(true);
  const [instructorHasAccess, setInstructorHasAccess] = useState(false);

  // Instructor assignment state (for admins)
  const [allInstructors, setAllInstructors] = useState<Instructor[]>([]);
  const [courseInstructors, setCourseInstructors] = useState<Array<Instructor & { instructor_role: string; display_order: number }>>([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState('');
  const [assignSuccess, setAssignSuccess] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const { course, loading: courseLoading } = useCourse(slug);
  const { hasAccess, courseSignupId, loading: accessLoading } = useCheckCourseAccess(
    user?.id,
    slug
  );
  const { checklist, studentProgress, loading: checklistLoading, updateItem } = useCourseChecklist(
    course?.id,
    courseSignupId
  );

  // Check instructor authentication
  useEffect(() => {
    const checkInstructorAuth = async () => {
      const instructorId = Cookies.get('instructorId');
      const userType = Cookies.get('userType');

      if (instructorId && userType === 'instructor') {
        try {
          const result = await verifyInstructorAction(instructorId);
          if (result.success && result.data) {
            setInstructor(result.data);
          }
        } catch (error) {
          console.error('Instructor auth error:', error);
        }
      }
      setInstructorLoading(false);
    };

    checkInstructorAuth();
  }, []);

  // Check instructor access to course
  useEffect(() => {
    const checkInstructorCourseAccess = async () => {
      if (!instructor || !course) {
        setInstructorHasAccess(false);
        return;
      }

      // Admin can view all courses
      if (canViewAllCourses(instructor)) {
        setInstructorHasAccess(true);
        return;
      }

      // Check if instructor is assigned to this course
      try {
        const result = await getCourseByIdAction(course.id, instructor.id);
        setInstructorHasAccess(result.success);
      } catch (error) {
        console.error('Error checking instructor access:', error);
        setInstructorHasAccess(false);
      }
    };

    checkInstructorCourseAccess();
  }, [instructor, course]);

  // Fetch instructors for assignment (admin only)
  useEffect(() => {
    const fetchInstructors = async () => {
      if (!instructor || !course || !canViewAllCourses(instructor)) {
        return;
      }

      try {
        const [allInstructorsResult, courseInstructorsResult] = await Promise.all([
          getAllInstructorsAction(instructor.id),
          getCourseInstructorsAction(course.id),
        ]);

        if (allInstructorsResult.success && allInstructorsResult.data) {
          setAllInstructors(allInstructorsResult.data);
        }

        if (courseInstructorsResult.success && courseInstructorsResult.data) {
          setCourseInstructors(courseInstructorsResult.data);
        }
      } catch (error) {
        console.error('Error fetching instructors:', error);
      }
    };

    fetchInstructors();
  }, [instructor, course]);

  // Redirect to login only if neither student nor instructor is authenticated
  useEffect(() => {
    if (!authLoading && !instructorLoading && !user && !instructor) {
      router.push('/login');
    }
  }, [user, instructor, authLoading, instructorLoading, router]);

  // Handler functions for instructor assignment
  const handleAssignInstructor = async (instructorId: string) => {
    if (!instructor || !course) return;

    setAssignLoading(true);
    setAssignError('');
    setAssignSuccess('');

    try {
      const result = await assignInstructorToCourseAction(
        instructor.id,
        course.id,
        instructorId,
        'instructor'
      );

      if (result.success) {
        setAssignSuccess('Instructor assigned successfully!');

        // Refresh course instructors
        const refreshResult = await getCourseInstructorsAction(course.id);
        if (refreshResult.success && refreshResult.data) {
          setCourseInstructors(refreshResult.data);
        }

        setTimeout(() => setAssignSuccess(''), 3000);
      } else {
        setAssignError(result.error || 'Failed to assign instructor');
      }
    } catch (error: any) {
      setAssignError(error.message || 'An error occurred');
    } finally {
      setAssignLoading(false);
    }
  };

  const handleRemoveInstructor = async (instructorId: string) => {
    if (!instructor || !course) return;
    if (!confirm('Are you sure you want to remove this instructor from the course?')) return;

    setAssignLoading(true);
    setAssignError('');
    setAssignSuccess('');

    try {
      const result = await removeInstructorFromCourseAction(
        instructor.id,
        course.id,
        instructorId
      );

      if (result.success) {
        setAssignSuccess('Instructor removed successfully!');

        // Refresh course instructors
        const refreshResult = await getCourseInstructorsAction(course.id);
        if (refreshResult.success && refreshResult.data) {
          setCourseInstructors(refreshResult.data);
        }

        setTimeout(() => setAssignSuccess(''), 3000);
      } else {
        setAssignError(result.error || 'Failed to remove instructor');
      }
    } catch (error: any) {
      setAssignError(error.message || 'An error occurred');
    } finally {
      setAssignLoading(false);
    }
  };

  if (authLoading || courseLoading || accessLoading || instructorLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#10b981] mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  // Allow access if either student or instructor is authenticated
  if (!user && !instructor) {
    return null;
  }

  // Determine which type of user and their access
  const isStudent = !!user;
  const isInstructor = !!instructor;
  const userHasAccess = isStudent ? hasAccess : instructorHasAccess;

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-4 uppercase">
            {t('course.notFound')}
          </h2>
          <Link href="/dashboard" className="text-sm md:text-base text-[#10b981] hover:text-[#059669] font-bold">
            {t('course.backToDashboard')}
          </Link>
        </div>
      </div>
    );
  }

  if (!userHasAccess) {
    const dashboardLink = isInstructor ? '/instructor/dashboard' : '/dashboard';

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg border-2 border-red-500 p-6 md:p-8 text-center animate-fade-in shadow-sm">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-red-50 rounded-lg flex items-center justify-center mx-auto mb-4 md:mb-6">
            <svg
              className="w-8 h-8 md:w-10 md:h-10 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-gray-900 mb-2 md:mb-3 uppercase tracking-wide">
            {t('course.accessDenied')}
          </h2>
          <p className="text-sm md:text-base text-gray-600 mb-4 md:mb-6">
            {isInstructor
              ? 'You need to be assigned to this course to view it.'
              : t('course.accessDeniedMessage')}
          </p>
          <Link
            href={dashboardLink}
            className="inline-block px-5 py-2.5 md:px-6 md:py-3 bg-[#10b981] text-white text-sm md:text-base rounded-lg hover:bg-[#059669] font-bold uppercase tracking-wide transition-all"
          >
            {t('course.backToDashboard')}
          </Link>
        </div>
      </div>
    );
  }

  const dashboardLink = isInstructor ? '/instructor/dashboard' : '/dashboard';

  const handleLogout = () => {
    if (isInstructor) {
      Cookies.remove('instructorId');
      Cookies.remove('userType');
      router.push('/instructor/login');
    } else {
      // Student logout logic would go here
      router.push('/login');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-8">
        {/* Course Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs px-2 py-1 rounded bg-emerald-50 text-[#10b981] font-bold uppercase">
              {course.category}
            </span>
            {course.level && (
              <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 font-bold uppercase">
                {course.level}
              </span>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-2">{course.title}</h1>
          <p className="text-sm text-gray-600">{course.description}</p>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Left Column (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Course Content */}
            <div className="bg-white rounded-lg border border-gray-200 emerald-accent-left p-6 animate-fade-in shadow-sm">
              <MarkdownContent content={course.content} />
            </div>
          </div>

          {/* Sidebar - Right Column (1/3) */}
          <div className="lg:col-span-1 space-y-6">
            {/* Checklist - Only for students */}
            {isStudent && !checklistLoading && checklist && studentProgress && (
              <Checklist
                checklist={checklist}
                progress={studentProgress}
                onUpdateItem={updateItem}
              />
            )}

            {/* Instructor note */}
            {isInstructor && (
              <div className="bg-emerald-50 border border-[#10b981] rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  <span className="font-bold text-[#10b981]">
                    {canViewAllCourses(instructor) ? 'Admin View:' : 'Instructor View:'}
                  </span>{' '}
                  You are viewing this course as {canViewAllCourses(instructor) ? 'an admin' : 'an instructor'}.
                </p>
              </div>
            )}

            {/* Instructor Assignment (Admin Only) */}
            {isInstructor && canViewAllCourses(instructor) && (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-sm font-bold text-gray-900">Manage Instructors</h3>
                </div>

                {/* Messages */}
                {assignError && (
                  <div className="mx-4 mt-4 rounded-md bg-red-50 border border-red-500 p-3">
                    <p className="text-xs text-red-600">{assignError}</p>
                  </div>
                )}

                {assignSuccess && (
                  <div className="mx-4 mt-4 rounded-md bg-emerald-50 border border-[#10b981] p-3">
                    <p className="text-xs text-[#10b981] font-semibold">{assignSuccess}</p>
                  </div>
                )}

                {/* Assigned Instructors */}
                <div className="p-4">
                  <h4 className="text-xs font-bold text-gray-700 mb-2 uppercase">
                    Assigned ({courseInstructors.length})
                  </h4>
                  {courseInstructors.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-4">
                      No instructors assigned yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {courseInstructors.map((inst) => (
                        <div
                          key={inst.id}
                          className="flex items-center justify-between p-2 border border-gray-200 rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
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
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-gray-900 truncate">
                                {inst.first_name} {inst.last_name}
                              </p>
                              <p className="text-xs text-gray-500 truncate">{inst.instructor_role}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveInstructor(inst.id)}
                            disabled={assignLoading}
                            className="px-2 py-1 text-xs font-semibold rounded text-red-600 border border-red-200 hover:bg-red-50 transition-all disabled:opacity-50 flex-shrink-0"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Available Instructors */}
                <div className="p-4 pt-0">
                  <h4 className="text-xs font-bold text-gray-700 mb-2 uppercase">
                    Add Instructor
                  </h4>
                  {allInstructors.filter(i => !courseInstructors.find(ci => ci.id === i.id)).length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-4">
                      All instructors are already assigned.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {allInstructors
                        .filter(i => !courseInstructors.find(ci => ci.id === i.id))
                        .map((inst) => (
                          <div
                            key={inst.id}
                            className="flex items-center justify-between p-2 border border-gray-200 rounded-lg"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                {inst.picture_url ? (
                                  <img
                                    src={inst.picture_url}
                                    alt={inst.first_name}
                                    className="w-full h-full rounded-full object-cover"
                                  />
                                ) : (
                                  <span className="text-xs font-semibold text-gray-600">
                                    {inst.first_name[0]}{inst.last_name[0]}
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-gray-900 truncate">
                                  {inst.first_name} {inst.last_name}
                                </p>
                                <p className="text-xs text-gray-500 truncate">{inst.email}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleAssignInstructor(inst.id)}
                              disabled={assignLoading}
                              className="px-2 py-1 text-xs font-semibold rounded text-white bg-[#10b981] hover:bg-[#059669] transition-all disabled:opacity-50 flex-shrink-0"
                            >
                              Add
                            </button>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Course Info Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-3">{t('course.courseInfo')}</h3>
              <div className="space-y-2 text-sm">
                {course.duration_hours && (
                  <div className="flex items-center text-gray-600">
                    <svg className="w-4 h-4 mr-2 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {course.duration_hours} {t('course.hours')}
                  </div>
                )}
                {course.enrollment_count > 0 && (
                  <div className="flex items-center text-gray-600">
                    <svg className="w-4 h-4 mr-2 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    {course.enrollment_count} {t('course.students')}
                  </div>
                )}
              </div>

              {/* Prerequisites */}
              {course.prerequisites && course.prerequisites.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-xs font-bold text-gray-700 mb-2 uppercase">{t('course.prerequisites')}</h4>
                  <ul className="space-y-1 text-xs text-gray-600">
                    {course.prerequisites.map((prereq, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-[#10b981] mr-1">•</span>
                        {prereq}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
