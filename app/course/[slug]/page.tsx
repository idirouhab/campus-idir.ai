'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCourse, useCheckCourseAccess } from '@/hooks/useCourses';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import MarkdownContent from '@/components/MarkdownContent';
import Cookies from 'js-cookie';
import { verifyInstructorAction } from '@/lib/instructor-auth-actions';
import { getCourseByIdAction, getAllInstructorsAction } from '@/lib/course-actions';
import { Instructor, CourseMaterial } from '@/types/database';
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

  // Course materials state (for students)
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);

  const { course, loading: courseLoading } = useCourse(slug);
  const { hasAccess, loading: accessLoading } = useCheckCourseAccess(
    user?.id,
    slug
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
        const result = await getCourseByIdAction(course.id);
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
          getAllInstructorsAction(),
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

  // Fetch course materials for students
  useEffect(() => {
    const fetchMaterials = async () => {
      if (!user || !course || !hasAccess) {
        return;
      }

      setMaterialsLoading(true);
      try {
        const response = await fetch(`/api/courses/${course.id}/materials/public`);
        const data = await response.json();
        console.log(data);

        if (data.success) {
          setMaterials(data.materials || []);
        }
      } catch (error) {
        console.error('Error fetching course materials:', error);
      } finally {
        setMaterialsLoading(false);
      }
    };

    fetchMaterials();
  }, [user, course, hasAccess]);

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
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-2">{course.title}</h1>
          {course.short_description && (
            <p className="text-sm text-gray-600">{course.short_description}</p>
          )}
        </div>

        {/* Admin Edit Button */}
        {instructor && canViewAllCourses(instructor) && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="text-sm font-bold text-blue-900 uppercase tracking-wide">
                  Admin Access
                </span>
              </div>
              <Link
                href={`/instructor/dashboard/courses/${course.id}/edit`}
                className="px-4 py-2 bg-blue-500 text-white text-sm font-bold rounded-lg hover:bg-blue-600 transition-all uppercase tracking-wide flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Course
              </Link>
            </div>
          </div>
        )}

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Left Column (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Course Overview */}
            <div className="bg-white rounded-lg border border-gray-200 emerald-accent-left p-6 animate-fade-in shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Course Overview</h2>
              {course.course_data?.long_description ? (
                <div className="prose prose-sm max-w-none">
                  <MarkdownContent content={course.course_data.long_description} />
                </div>
              ) : course.short_description ? (
                <p className="text-gray-600">{course.short_description}</p>
              ) : (
                <p className="text-gray-500 italic">No course description available.</p>
              )}
            </div>

            {/* Course Materials Section - Only for Students */}
            {isStudent && (
              <div className="bg-white rounded-lg border border-gray-200 emerald-accent-left p-6 animate-fade-in shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <svg className="w-6 h-6 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <h2 className="text-xl font-bold text-gray-900">Course Materials</h2>
                </div>

                {materialsLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin w-12 h-12 border-4 border-[#10b981] border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-4">Loading materials...</p>
                  </div>
                ) : materials.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <svg className="w-20 h-20 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-lg font-medium mb-2">No materials available yet</p>
                    <p className="text-sm">Your instructor hasn't uploaded any course materials yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {materials.map((material) => {
                      const getFileIcon = () => {
                        switch (material.file_type.toLowerCase()) {
                          case 'pdf':
                            return (
                              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                            );
                          case 'doc':
                          case 'docx':
                            return (
                              <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            );
                          case 'ppt':
                          case 'pptx':
                            return (
                              <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                            );
                          default:
                            return (
                              <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                            );
                        }
                      };

                      const formatFileSize = (bytes: number) => {
                        if (bytes < 1024) return `${bytes} B`;
                        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
                        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
                      };

                      return (
                        <div
                          key={material.id}
                          className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                        >
                          {/* File Icon */}
                          <div className="flex-shrink-0">
                            {getFileIcon()}
                          </div>

                          {/* File Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {material.display_filename}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(material.file_size_bytes)} • {material.file_type.toUpperCase()}
                            </p>
                          </div>

                          {/* Download Button */}
                          <a
                            href={material.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-[#10b981] text-white text-sm font-bold rounded-lg hover:bg-[#059669] transition-colors flex items-center gap-2 flex-shrink-0"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download
                          </a>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Course Content Structure - TODO: Implement lessons/modules */}
            {isStudent && (
              <div className="bg-white rounded-lg border border-gray-200 emerald-accent-left p-6 animate-fade-in shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <svg className="w-6 h-6 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <h2 className="text-xl font-bold text-gray-900">Course Curriculum</h2>
                </div>
                <p className="text-gray-600">Detailed course curriculum and lessons will be available here.</p>
              </div>
            )}
          </div>

          {/* Sidebar - Right Column (1/3) */}
          <div className="lg:col-span-1 space-y-6">
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
                              {inst.profile?.picture_url ? (
                                <img
                                  src={inst.profile.picture_url}
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
                                {inst.profile?.picture_url ? (
                                  <img
                                    src={inst.profile.picture_url}
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
                {course.enrollment_count > 0 && (
                  <div className="flex items-center text-gray-600">
                    <svg className="w-4 h-4 mr-2 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    {course.enrollment_count} {t('course.students')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
