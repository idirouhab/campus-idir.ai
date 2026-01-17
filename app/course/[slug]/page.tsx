'use client';

import {useAuth} from '@/contexts/AuthContext';
import {useLanguage} from '@/contexts/LanguageContext';
import {useQuery} from '@tanstack/react-query';
import {useRouter, useParams} from 'next/navigation';
import {useEffect, useState} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import MarkdownContent from '@/components/MarkdownContent';
import Cookies from 'js-cookie';
import {verifyInstructorAction} from '@/lib/instructor-auth-actions';
import {getAllInstructorsAction} from '@/lib/course-actions';
import {checkCourseAccessAction} from '@/lib/courses-actions';
import {Instructor, CourseMaterial, CourseSession} from '@/types/database';
import {canViewAllCourses} from '@/lib/roles';
import {
    assignInstructorToCourseAction,
    removeInstructorFromCourseAction,
    getCourseInstructorsAction,
} from '@/lib/instructor-assignment-actions';
import {getCourseSessionsAction} from '@/lib/session-actions';
import SessionsList from '@/components/courses/SessionsList';
import LoadingOverlay from '@/components/LoadingOverlay';

export default function CoursePage() {
    const {user, loading: authLoading} = useAuth();
    const {t} = useLanguage();
    const router = useRouter();
    const params = useParams();
    const slug = params?.slug as string;

    // Instructor auth state
    const [instructor, setInstructor] = useState<Instructor | null>(null);
    const [instructorLoading, setInstructorLoading] = useState(true);
    const [instructorHasAccess, setInstructorHasAccess] = useState(false);

    // Instructor assignment state (for admins)
    const [allInstructors, setAllInstructors] = useState<Instructor[]>([]);
    const [courseInstructors, setCourseInstructors] = useState<Array<Instructor & {
        instructor_role: string;
        display_order: number
    }>>([]);
    const [assignLoading, setAssignLoading] = useState(false);
    const [assignError, setAssignError] = useState('');
    const [assignSuccess, setAssignSuccess] = useState('');

    // Course materials state (for students)
    // FIXED: Removed conflicting materialsLoading state
    const [materials, setMaterials] = useState<CourseMaterial[]>([]);

    // Course sessions state
    // FIXED: Removed conflicting sessionsLoading state
    const [sessions, setSessions] = useState<CourseSession[]>([]);

    // Fetch course data with React Query (cached)
    const {data: course, isLoading: courseLoading} = useQuery({
        queryKey: ['course', slug],
        queryFn: async () => {
            const response = await fetch(`/api/courses/by-slug/${slug}`);
            if (!response.ok) throw new Error('Failed to fetch course');
            const data = await response.json();
            return data.course;
        },
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    });

    // Check course access with React Query (cached) - uses server action
    const {data: accessData, isLoading: accessLoading} = useQuery({
        queryKey: ['course-access', slug, user?.id],
        queryFn: async () => {
            if (!user?.id || !slug) return {hasAccess: false, courseSignupId: undefined};
            const result = await checkCourseAccessAction(slug);
            if (result.success) {
                return {hasAccess: result.hasAccess, courseSignupId: result.courseSignupId};
            }
            return {hasAccess: false, courseSignupId: undefined};
        },
        enabled: !!user?.id && !!slug,
    });
    const hasAccess = accessData?.hasAccess || false;

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

    // Check instructor access to course with React Query
    const {data: instructorAccessData} = useQuery({
        queryKey: ['instructor-access', course?.id, instructor?.id],
        queryFn: async () => {
            if (!instructor || !course) return {hasAccess: false};

            // Admin can view all courses
            if (canViewAllCourses(instructor)) {
                return {hasAccess: true};
            }

            // Check if instructor is assigned to this course
            const response = await fetch(`/api/courses/${course.id}/check-instructor-access`);
            const data = await response.json();
            return {hasAccess: data.hasAccess || false};
        },
        enabled: !!instructor && !!course,
    });

    useEffect(() => {
        setInstructorHasAccess(instructorAccessData?.hasAccess || false);
    }, [instructorAccessData]);

    // Fetch course instructors with React Query (cached, parallel)
    const {data: courseInstructorsData} = useQuery({
        queryKey: ['course-instructors', course?.id],
        queryFn: async () => {
            if (!course) return [];
            const result = await getCourseInstructorsAction(course.id);
            return result.success && result.data ? result.data : [];
        },
        enabled: !!course && (!!user || !!instructor),
    });

    // Fetch all instructors for admin (cached, parallel)
    const {data: allInstructorsData} = useQuery({
        queryKey: ['all-instructors'],
        queryFn: async () => {
            const result = await getAllInstructorsAction();
            return result.success && result.data ? result.data : [];
        },
        enabled: !!instructor && !!course && canViewAllCourses(instructor),
        staleTime: 10 * 60 * 1000, // Cache for 10 minutes (rarely changes)
    });

    // Update state when data changes
    useEffect(() => {
        if (courseInstructorsData) {
            setCourseInstructors(courseInstructorsData);
        }
    }, [courseInstructorsData]);

    useEffect(() => {
        if (allInstructorsData) {
            setAllInstructors(allInstructorsData);
        }
    }, [allInstructorsData]);

    // Fetch course materials with React Query (cached, parallel)
    const {data: materialsData, isLoading: materialsLoading} = useQuery({
        queryKey: ['course-materials', course?.id],
        queryFn: async () => {
            if (!course) return [];
            const response = await fetch(`/api/courses/${course.id}/materials/public`);
            const data = await response.json();
            return data.success ? data.materials || [] : [];
        },
        enabled: !!user && !!course && hasAccess,
    });

    // Fetch course sessions with React Query (cached, parallel)
    const {data: sessionsData, isLoading: sessionsLoading} = useQuery({
        queryKey: ['course-sessions', course?.id],
        queryFn: async () => {
            if (!course) return [];

            // Use different endpoints based on user type
            if (user && hasAccess) {
                const response = await fetch(`/api/courses/${course.id}/sessions/public`);
                const data = await response.json();
                return data.success ? data.sessions || [] : [];
            } else if (instructor) {
                const result = await getCourseSessionsAction(course.id);
                return result.success && result.data ? result.data : [];
            }
            return [];
        },
        enabled: !!course && ((!!user && hasAccess) || !!instructor),
    });

    // Update state when data changes
    useEffect(() => {
        if (materialsData) {
            setMaterials(materialsData);
        }
    }, [materialsData]);

    useEffect(() => {
        if (sessionsData) {
            setSessions(sessionsData);
        }
    }, [sessionsData]);

    // Redirect to login only if neither student nor instructor is authenticated
    useEffect(() => {
        if (!authLoading && !instructorLoading && !user && !instructor) {
            router.push('/login');
        }
    }, [user, instructor, authLoading, instructorLoading, router]);

    // Show unified loading state while checking auth and loading course
    const isLoading = authLoading || instructorLoading || courseLoading || accessLoading;

    if (isLoading) {
        return <LoadingOverlay fullScreen={false}/>;
    }

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
                setAssignSuccess(t('course.instructorAssignedSuccess'));

                // Refresh course instructors
                const refreshResult = await getCourseInstructorsAction(course.id);
                if (refreshResult.success && refreshResult.data) {
                    setCourseInstructors(refreshResult.data);
                }

                setTimeout(() => setAssignSuccess(''), 3000);
            } else {
                setAssignError(result.error || t('course.instructorAssignedError'));
            }
        } catch (error: any) {
            setAssignError(error.message || t('course.errorOccurred'));
        } finally {
            setAssignLoading(false);
        }
    };

    const handleRemoveInstructor = async (instructorId: string) => {
        if (!instructor || !course) return;
        if (!confirm(t('course.confirmRemoveInstructor'))) return;

        setAssignLoading(true);
        setAssignError('');
        setAssignSuccess('');

        try {
            const result = await removeInstructorFromCourseAction(
                course.id,
                instructorId
            );

            if (result.success) {
                setAssignSuccess(t('course.instructorRemovedSuccess'));

                // Refresh course instructors
                const refreshResult = await getCourseInstructorsAction(course.id);
                if (refreshResult.success && refreshResult.data) {
                    setCourseInstructors(refreshResult.data);
                }

                setTimeout(() => setAssignSuccess(''), 3000);
            } else {
                setAssignError(result.error || t('course.instructorRemovedError'));
            }
        } catch (error: any) {
            setAssignError(error.message || t('course.errorOccurred'));
        } finally {
            setAssignLoading(false);
        }
    };


    // Allow access if either student or instructor is authenticated
    if (!user && !instructor) {
        return null;
    }

    // Determine which type of user and their access
    const isStudent = !!user;
    const isInstructor = !!instructor;
    // Grant access if user has EITHER student access OR instructor access (supports dual-role users)
    const userHasAccess = hasAccess || instructorHasAccess;

    // Debug logging
    console.log('[CoursePage] Access Debug:', {
        user: !!user,
        instructor: !!instructor,
        hasAccess,
        instructorHasAccess,
        userHasAccess,
        accessData,
        instructorAccessData,
    });

    console.log('[CoursePage] Course Data:', {
        course,
        course_data: course?.course_data,
        long_description: course?.course_data?.long_description,
        short_description: course?.short_description,
    });

    if (!course) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <div className="text-center">
                    <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-4 uppercase">
                        {t('course.notFound')}
                    </h2>
                    <Link href="/dashboard"
                          className="text-sm md:text-base text-[#10b981] hover:text-[#059669] font-bold">
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
                <div
                    className="max-w-md w-full bg-white rounded-lg border-2 border-red-500 p-6 md:p-8 text-center animate-fade-in shadow-sm">
                    <div
                        className="w-16 h-16 md:w-20 md:h-20 bg-red-50 rounded-lg flex items-center justify-center mx-auto mb-4 md:mb-6">
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
                            ? t('course.instructorAccessDenied')
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
                {/* Back to Dashboard Link */}
                <Link
                    href={dashboardLink}
                    className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-[#10b981] mb-4 font-semibold transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
                    </svg>
                    {t('course.backToDashboard')}
                </Link>

                {/* Course Header */}
                <div className="mb-6">
                    <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-2">{course.title}</h1>
                    {course.short_description && (
                        <p className="text-base text-gray-700 leading-relaxed">{course.short_description}</p>
                    )}
                </div>

                {/* Admin Edit Button */}
                {instructor && canViewAllCourses(instructor) && (
                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg animate-fade-in">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor"
                                     viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                                </svg>
                                <span className="text-sm font-bold text-blue-900 uppercase tracking-wide">
                  {t('course.adminAccess')}
                </span>
                            </div>
                            <Link
                                href={`/instructor/dashboard/courses/${course.id}/edit`}
                                className="px-4 py-2 bg-blue-500 text-white text-sm font-bold rounded-lg hover:bg-blue-600 transition-all uppercase tracking-wide flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                </svg>
                                {t('course.editCourse')}
                            </Link>
                        </div>
                    </div>
                )}

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content - Left Column (2/3) */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Course Materials Section - Only for Students - Only course-level materials */}
                        {isStudent && materials.filter(m => !m.session_id).length > 0 && (
                            <div
                                className="bg-white rounded-lg border border-gray-200 emerald-accent-left p-6 animate-fade-in shadow-sm">
                                <div className="flex items-center gap-3 mb-4">
                                    <svg className="w-6 h-6 text-[#10b981]" fill="none" stroke="currentColor"
                                         viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                                    </svg>
                                    <h2 className="text-xl font-bold text-gray-900">{t('course.generalMaterials')}</h2>
                                </div>

                                {materialsLoading ? (
                                    <div className="text-center py-12">
                                        <div
                                            className="animate-spin w-12 h-12 border-4 border-[#10b981] border-t-transparent rounded-full mx-auto"></div>
                                        <p className="text-sm text-gray-500 mt-4">{t('course.loadingMaterials')}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {materials.filter(m => !m.session_id).map((material) => {
                                            const getFileIcon = () => {
                                                // Check if it's a link resource
                                                if (material.resource_type === 'link') {
                                                    return (
                                                        <svg className="w-8 h-8 text-emerald-500" fill="none"
                                                             stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round"
                                                                  strokeWidth={2}
                                                                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
                                                        </svg>
                                                    );
                                                }

                                                switch (material.file_type.toLowerCase()) {
                                                    case 'pdf':
                                                        return (
                                                            <svg className="w-8 h-8 text-red-500" fill="none"
                                                                 stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round"
                                                                      strokeWidth={2}
                                                                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                                                            </svg>
                                                        );
                                                    case 'doc':
                                                    case 'docx':
                                                        return (
                                                            <svg className="w-8 h-8 text-blue-500" fill="none"
                                                                 stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round"
                                                                      strokeWidth={2}
                                                                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                                            </svg>
                                                        );
                                                    case 'ppt':
                                                    case 'pptx':
                                                        return (
                                                            <svg className="w-8 h-8 text-orange-500" fill="none"
                                                                 stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round"
                                                                      strokeWidth={2}
                                                                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                                                            </svg>
                                                        );
                                                    default:
                                                        return (
                                                            <svg className="w-8 h-8 text-gray-500" fill="none"
                                                                 stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round"
                                                                      strokeWidth={2}
                                                                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                                                            </svg>
                                                        );
                                                }
                                            };

                                            const formatFileSize = (bytes: number | null) => {
                                                if (bytes === null || bytes === undefined) return '';
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
                                                        <p className="text-base font-semibold text-gray-900 truncate">
                                                            {material.display_filename}
                                                        </p>
                                                        <p className="text-sm text-gray-600 font-medium">
                                                            {material.resource_type === 'link'
                                                                ? 'Google Drive Link'
                                                                : `${formatFileSize(material.file_size_bytes)} • ${material.file_type.toUpperCase()}`
                                                            }
                                                        </p>
                                                    </div>

                                                    {/* Download/Open Link Button */}
                                                    <a
                                                        href={material.file_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="px-5 py-3 bg-[#10b981] text-white text-base font-bold rounded-lg hover:bg-[#059669] transition-colors flex items-center gap-2 flex-shrink-0 min-h-[44px]"
                                                    >
                                                        {material.resource_type === 'link' ? (
                                                            <>
                                                                <svg className="w-4 h-4" fill="none"
                                                                     stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round"
                                                                          strokeWidth={2}
                                                                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                                                                </svg>
                                                                Open Link
                                                            </>
                                                        ) : (
                                                            <>
                                                                <svg className="w-4 h-4" fill="none"
                                                                     stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round"
                                                                          strokeWidth={2}
                                                                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                                                                </svg>
                                                                {t('course.download')}
                                                            </>
                                                        )}
                                                    </a>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Course Sessions */}
                        {sessions.length > 0 && (
                            <div
                                className="bg-white rounded-lg border border-gray-200 emerald-accent-left p-6 animate-fade-in shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <svg className="w-6 h-6 text-[#10b981]" fill="none" stroke="currentColor"
                                         viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                    </svg>
                                    <h2 className="text-xl font-bold text-gray-900">{t('course.courseSessions')}</h2>
                                </div>

                                {sessionsLoading ? (
                                    <div className="text-center py-12">
                                        <div
                                            className="animate-spin w-12 h-12 border-4 border-[#10b981] border-t-transparent rounded-full mx-auto"></div>
                                        <p className="text-sm text-gray-500 mt-4">{t('course.loadingSessions')}</p>
                                    </div>
                                ) : (
                                    <SessionsList sessions={sessions} courseId={course.id}/>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Sidebar - Right Column (1/3) */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Course Overview */}
                        <div
                            className="bg-white rounded-lg border border-gray-200 emerald-accent-left p-6 animate-fade-in shadow-sm">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">{t('course.courseOverview')}</h2>

                            {/* Course Stats */}
                            <div className="space-y-4 mb-6">
                                {/* Instructors */}
                                {/* Instructors */}
                                {courseInstructors.length > 0 && (
                                    <div className="flex items-start gap-3">
                                        <svg className="w-5 h-5 text-[#10b981] mt-0.5 flex-shrink-0" fill="none"
                                             stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                        </svg>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 mb-1">{t('course.instructors')}</p>
                                            <div className="space-y-3">
                                                {courseInstructors.map((inst) => (
                                                    <div key={inst.id} className="group flex flex-col">
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-sm font-bold text-gray-800">
                                                                {inst.first_name} {inst.last_name}
                                                            </p>
                                                            {inst.instructor_role !== 'instructor' && (
                                                                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-black uppercase tracking-wider">
                                    {inst.instructor_role}
                                </span>
                                                            )}
                                                        </div>
                                                        <a
                                                            href={`mailto:${inst.email}`}
                                                            className="inline-flex items-center gap-1.5 mt-0.5 text-sm text-gray-500 hover:text-[#10b981] transition-colors w-fit"
                                                        >
                                                            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                            </svg>
                                                            <span className="truncate border-b border-transparent group-hover:border-emerald-200">
                                {inst.email}
                            </span>
                                                        </a>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Starting Date */}
                                {(course.course_data?.logistics?.startDate || (sessions.length > 0 && sessions[0]?.session_date)) && (
                                    <div className="flex items-start gap-3">
                                        <svg className="w-5 h-5 text-[#10b981] mt-0.5 flex-shrink-0" fill="none"
                                             stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                        </svg>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">{t('course.startDate')}</p>
                                            <p className="text-sm text-gray-700">
                                                {course.course_data?.logistics?.startDate ||
                                                    new Date(sessions[0].session_date).toLocaleDateString(course.language === 'es' ? 'es-ES' : 'en-US', {
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric'
                                                    })
                                                }
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Duration & Total Time */}
                                {(course.course_data?.logistics?.duration || course.course_data?.logistics?.hours || sessions.length > 0) && (
                                    <div className="flex items-start gap-3">
                                        <svg className="w-5 h-5 text-[#10b981] mt-0.5 flex-shrink-0" fill="none"
                                             stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                        </svg>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">{t('course.duration')}</p>
                                            <p className="text-sm text-gray-700">
                                                {(() => {
                                                    const duration = course.course_data?.logistics?.duration || (sessions.length > 1 && sessions[0]?.session_date && sessions[sessions.length - 1]?.session_date ? (() => {
                                                        const start = new Date(sessions[0].session_date);
                                                        const end = new Date(sessions[sessions.length - 1].session_date);
                                                        const weeks = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7));
                                                        return `${weeks} ${weeks === 1 ? t('course.week') : t('course.weeks')}`;
                                                    })() : null);

                                                    const hours = course.course_data?.logistics?.hours || (sessions.length > 0 ? (() => {
                                                        const totalMinutes = sessions.reduce((sum, session) => {
                                                            return sum + (session.duration_minutes || 0);
                                                        }, 0);
                                                        const h = Math.floor(totalMinutes / 60);
                                                        const m = totalMinutes % 60;
                                                        if (h > 0 && m > 0) {
                                                            return `${h}h ${m}min`;
                                                        } else if (h > 0) {
                                                            return `${h}h`;
                                                        } else {
                                                            return `${m}min`;
                                                        }
                                                    })() : null);

                                                    const parts = [];
                                                    if (duration) parts.push(duration);
                                                    if (hours) parts.push(hours);
                                                    return parts.join(' • ');
                                                })()}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Modalidad (Mode - Virtual/Onsite) */}
                                {(course.course_data?.logistics?.modality || course.course_data?.mode) && (
                                    <div className="flex items-start gap-3">
                                        <svg className="w-5 h-5 text-[#10b981] mt-0.5 flex-shrink-0" fill="none"
                                             stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                                        </svg>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">{t('course.mode')}</p>
                                            <p className="text-sm text-gray-700">
                                                {(() => {
                                                    const modeValue = course.course_data?.logistics?.modality || course.course_data?.mode;
                                                    if (!modeValue) return '';
                                                    const mode = modeValue.toLowerCase();
                                                    if (mode === 'online' || mode === 'virtual') {
                                                        return course.language === 'es' ? 'Virtual (Online)' : 'Virtual (Online)';
                                                    } else if (mode === 'presencial' || mode === 'onsite' || mode === 'on-site') {
                                                        return course.language === 'es' ? 'Presencial (On-site)' : 'On-site (In-person)';
                                                    } else if (mode === 'híbrido' || mode === 'hybrid') {
                                                        return course.language === 'es' ? 'Híbrido (Hybrid)' : 'Hybrid';
                                                    } else {
                                                        return modeValue;
                                                    }
                                                })()}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Schedule (Day and Time) */}
                                {(course.course_data?.logistics?.schedule || course.course_data?.logistics?.scheduleDetail) && (
                                    <div className="flex items-start gap-3">
                                        <svg className="w-5 h-5 text-[#10b981] mt-0.5 flex-shrink-0" fill="none"
                                             stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                        </svg>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">{t('course.schedule')}</p>
                                            <p className="text-sm text-gray-700">
                                                {course.course_data.logistics.schedule}
                                                {course.course_data.logistics.scheduleDetail && (
                                                    <span className="block text-gray-600">
                                                        {course.course_data.logistics.scheduleDetail}
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Forum Link */}
                                <Link href={`/course/${slug}/forum`}
                                      className="flex items-start gap-3 hover:bg-gray-50 -mx-2 px-2 py-2 rounded-lg transition-colors">
                                    <svg className="w-5 h-5 text-[#10b981] mt-0.5 flex-shrink-0" fill="none"
                                         stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                              d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"/>
                                    </svg>
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-[#10b981]">{t('course.courseForum')}</p>
                                        <p className="text-xs text-gray-600">{t('course.forumDescription')}</p>
                                    </div>
                                    <svg className="w-4 h-4 text-gray-400 mt-1" fill="none" stroke="currentColor"
                                         viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                              d="M9 5l7 7-7 7"/>
                                    </svg>
                                </Link>
                            </div>

                            {/* Description */}
                            <div className="pt-4 border-t border-gray-200">
                                <h3 className="text-sm font-bold text-gray-900 mb-2">{t('course.aboutCourse')}</h3>
                                {course.course_data?.long_description ? (
                                    <div className="prose prose-sm max-w-none text-gray-700">
                                        <MarkdownContent content={course.course_data.long_description}/>
                                    </div>
                                ) : course.short_description ? (
                                    <p className="text-sm text-gray-700">{course.short_description}</p>
                                ) : (
                                    <p className="text-sm text-gray-500 italic">{t('course.noDescription')}</p>
                                )}
                            </div>
                        </div>

                        {/* Instructor note */}
                        {isInstructor && (
                            <div className="bg-emerald-50 border border-[#10b981] rounded-lg p-4">
                                <p className="text-sm text-gray-700">
                  <span className="font-bold text-[#10b981]">
                    {canViewAllCourses(instructor) ? t('course.adminView') : t('course.instructorView')}
                  </span>{' '}
                                    {canViewAllCourses(instructor) ? t('course.viewingAsAdmin') : t('course.viewingAsInstructor')}
                                </p>
                            </div>
                        )}

                        {/* Instructor Assignment (Admin Only) */}
                        {isInstructor && canViewAllCourses(instructor) && (
                            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                                <div className="p-4 border-b border-gray-200">
                                    <h3 className="text-sm font-bold text-gray-900">{t('course.manageInstructors')}</h3>
                                </div>

                                {/* Messages */}
                                {assignError && (
                                    <div className="mx-4 mt-4 rounded-md bg-red-50 border border-red-500 p-3">
                                        <p className="text-sm text-red-700 font-medium">{assignError}</p>
                                    </div>
                                )}

                                {assignSuccess && (
                                    <div className="mx-4 mt-4 rounded-md bg-emerald-50 border border-[#10b981] p-3">
                                        <p className="text-sm text-[#10b981] font-semibold">{assignSuccess}</p>
                                    </div>
                                )}

                                {/* Assigned Instructors */}
                                <div className="p-4">
                                    <h4 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wide">
                                        {t('course.assigned')} ({courseInstructors.length})
                                    </h4>
                                    {courseInstructors.length === 0 ? (
                                        <p className="text-sm text-gray-600 text-center py-4">
                                            {t('course.noInstructorsAssigned')}
                                        </p>
                                    ) : (
                                        <div className="space-y-2">
                                            {courseInstructors.map((inst) => (
                                                <div
                                                    key={inst.id}
                                                    className="flex items-center justify-between p-2 border border-gray-200 rounded-lg"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0 relative overflow-hidden">
                                                            {inst.profile?.picture_url && inst.profile.picture_url.trim() !== '' ? (
                                                                <Image
                                                                    src={inst.profile.picture_url}
                                                                    alt={inst.first_name}
                                                                    fill
                                                                    sizes="32px"
                                                                    className="rounded-full object-cover"
                                                                    unoptimized={inst.profile.picture_url.includes('127.0.0.1') || inst.profile.picture_url.includes('localhost')}
                                                                    onError={(e) => {
                                                                        e.currentTarget.style.display = 'none';
                                                                    }}
                                                                />
                                                            ) : (
                                                                <span className="text-xs font-semibold text-[#10b981]">
                                  {inst.first_name[0]}{inst.last_name[0]}
                                </span>
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-semibold text-gray-900 truncate">
                                                                {inst.first_name} {inst.last_name}
                                                            </p>
                                                            <p className="text-sm text-gray-600 truncate">{inst.instructor_role}</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleRemoveInstructor(inst.id)}
                                                        disabled={assignLoading}
                                                        className="px-3 py-2 text-sm font-semibold rounded text-red-600 border border-red-200 hover:bg-red-50 transition-all disabled:opacity-50 flex-shrink-0 min-h-[44px]"
                                                    >
                                                        {t('course.remove')}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Available Instructors */}
                                <div className="p-4 pt-0">
                                    <h4 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wide">
                                        {t('course.addInstructor')}
                                    </h4>
                                    {allInstructors.filter(i => !courseInstructors.find(ci => ci.id === i.id)).length === 0 ? (
                                        <p className="text-sm text-gray-600 text-center py-4">
                                            {t('course.allInstructorsAssigned')}
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
                                                            <div
                                                                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 relative overflow-hidden">
                                                                {inst.profile?.picture_url && inst.profile.picture_url.trim() !== '' ? (
                                                                    <Image
                                                                        src={inst.profile.picture_url}
                                                                        alt={inst.first_name}
                                                                        fill
                                                                        sizes="32px"
                                                                        className="rounded-full object-cover"
                                                                        unoptimized={inst.profile.picture_url.includes('127.0.0.1') || inst.profile.picture_url.includes('localhost')}
                                                                        onError={(e) => {
                                                                            e.currentTarget.style.display = 'none';
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <span
                                                                        className="text-xs font-semibold text-gray-600">
                                    {inst.first_name[0]}{inst.last_name[0]}
                                  </span>
                                                                )}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-semibold text-gray-900 truncate">
                                                                    {inst.first_name} {inst.last_name}
                                                                </p>
                                                                <p className="text-sm text-gray-600 truncate">{inst.email}</p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleAssignInstructor(inst.id)}
                                                            disabled={assignLoading}
                                                            className="px-3 py-2 text-sm font-semibold rounded text-white bg-[#10b981] hover:bg-[#059669] transition-all disabled:opacity-50 flex-shrink-0 min-h-[44px]"
                                                        >
                                                            {t('course.add')}
                                                        </button>
                                                    </div>
                                                ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}