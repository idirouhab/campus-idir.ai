'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { verifyInstructorAction } from '@/lib/instructor-auth-actions';
import { getInstructorCoursesAction, getAllInstructorsAction } from '@/lib/course-actions';
import {
  assignInstructorToCourseAction,
  removeInstructorFromCourseAction,
  getCourseInstructorsAction,
} from '@/lib/instructor-assignment-actions';
import { Instructor, CourseInstructorRole } from '@/types/database';
import { useInstructorPermissions } from '@/hooks/useInstructorPermissions';
import Cookies from 'js-cookie';

interface Course {
  id: string;
  title: string;
  slug: string;
  status: string;
}

interface InstructorWithRole extends Instructor {
  instructor_role?: CourseInstructorRole;
  display_order?: number;
}

export default function ManageInstructorsPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<Instructor | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [allInstructors, setAllInstructors] = useState<Instructor[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [courseInstructors, setCourseInstructors] = useState<InstructorWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignLoading, setAssignLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const permissions = useInstructorPermissions(admin);

  // Auth check
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
          setAdmin(result.data);

          // Check admin permission
          if (result.data.role !== 'admin') {
            router.push('/instructor/dashboard');
            return;
          }
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

  // Fetch courses and instructors
  useEffect(() => {
    const fetchData = async () => {
      if (!admin) return;

      try {
        const [coursesResult, instructorsResult] = await Promise.all([
          getInstructorCoursesAction(),
          getAllInstructorsAction(),
        ]);

        if (coursesResult.success && coursesResult.data) {
          setCourses(coursesResult.data);
        }

        if (instructorsResult.success && instructorsResult.data) {
          setAllInstructors(instructorsResult.data);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [admin]);

  // Fetch course instructors when course is selected
  useEffect(() => {
    const fetchCourseInstructors = async () => {
      if (!selectedCourse) {
        setCourseInstructors([]);
        return;
      }

      try {
        const result = await getCourseInstructorsAction(selectedCourse);
        if (result.success && result.data) {
          setCourseInstructors(result.data);
        }
      } catch (error) {
        console.error('Error fetching course instructors:', error);
      }
    };

    fetchCourseInstructors();
  }, [selectedCourse]);

  const handleAssignInstructor = async (instructorId: string, role: CourseInstructorRole = 'instructor') => {
    if (!admin || !selectedCourse) return;

    setAssignLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await assignInstructorToCourseAction(
        selectedCourse,
        instructorId,
        role
      );

      if (result.success) {
        setSuccess('Instructor assigned successfully!');
        // Refresh course instructors
        const refreshResult = await getCourseInstructorsAction(selectedCourse);
        if (refreshResult.success && refreshResult.data) {
          setCourseInstructors(refreshResult.data);
        }
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || 'Failed to assign instructor');
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred');
    } finally {
      setAssignLoading(false);
    }
  };

  const handleRemoveInstructor = async (instructorId: string) => {
    if (!admin || !selectedCourse) return;
    if (!confirm('Are you sure you want to remove this instructor from the course?')) return;

    setAssignLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await removeInstructorFromCourseAction(
        selectedCourse,
        instructorId
      );

      if (result.success) {
        setSuccess('Instructor removed successfully!');
        // Refresh course instructors
        const refreshResult = await getCourseInstructorsAction(selectedCourse);
        if (refreshResult.success && refreshResult.data) {
          setCourseInstructors(refreshResult.data);
        }
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || 'Failed to remove instructor');
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred');
    } finally {
      setAssignLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#10b981] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!admin || !permissions.canAssignInstructors()) {
    return null;
  }

  const assignedInstructorIds = courseInstructors.map(i => i.id);
  const availableInstructors = allInstructors.filter(i => !assignedInstructorIds.includes(i.id));

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-8">
        {/* Page Title */}
        <div className="mb-6 md:mb-8 animate-fade-in-up">
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
            Manage <span className="text-[#10b981]">Instructors</span>
          </h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">
            Assign instructors to courses
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 rounded-md bg-red-50 border border-red-500 p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-md bg-emerald-50 border border-[#10b981] p-4">
            <p className="text-sm text-[#10b981] font-semibold">{success}</p>
          </div>
        )}

        {/* Course Selection */}
        <div className="bg-white rounded-lg border border-gray-200 emerald-accent-left p-6 shadow-sm mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Select Course</h2>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
          >
            <option value="">-- Select a course --</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title} ({course.status})
              </option>
            ))}
          </select>
        </div>

        {selectedCourse && (
          <>
            {/* Assigned Instructors */}
            <div className="bg-white rounded-lg border border-gray-200 emerald-accent-left p-6 shadow-sm mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Assigned Instructors ({courseInstructors.length})
              </h2>

              {courseInstructors.length === 0 ? (
                <p className="text-gray-600 text-center py-8">
                  No instructors assigned to this course yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {courseInstructors.map((instructor) => (
                    <div
                      key={instructor.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                          {instructor.picture_url ? (
                            <img
                              src={instructor.picture_url}
                              alt={instructor.first_name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-semibold text-[#10b981]">
                              {instructor.first_name[0]}{instructor.last_name[0]}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {instructor.first_name} {instructor.last_name}
                          </p>
                          <p className="text-sm text-gray-600">{instructor.email}</p>
                          <span className="text-xs text-gray-500">
                            Role: {instructor.instructor_role || 'instructor'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveInstructor(instructor.id)}
                        disabled={assignLoading}
                        className="px-3 py-1.5 text-sm font-semibold rounded-lg text-red-600 border border-red-200 hover:bg-red-50 transition-all disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Available Instructors */}
            <div className="bg-white rounded-lg border border-gray-200 emerald-accent-left p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Available Instructors ({availableInstructors.length})
              </h2>

              {availableInstructors.length === 0 ? (
                <p className="text-gray-600 text-center py-8">
                  All instructors have been assigned to this course.
                </p>
              ) : (
                <div className="space-y-3">
                  {availableInstructors.map((instructor) => (
                    <div
                      key={instructor.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                          {instructor.picture_url ? (
                            <img
                              src={instructor.picture_url}
                              alt={instructor.first_name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-semibold text-gray-600">
                              {instructor.first_name[0]}{instructor.last_name[0]}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {instructor.first_name} {instructor.last_name}
                          </p>
                          <p className="text-sm text-gray-600">{instructor.email}</p>
                          <span className="text-xs text-gray-500">
                            Account role: {instructor.role}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleAssignInstructor(instructor.id)}
                        disabled={assignLoading}
                        className="px-4 py-2 text-sm font-semibold rounded-lg text-white bg-[#10b981] hover:bg-[#059669] transition-all disabled:opacity-50"
                      >
                        Assign
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
