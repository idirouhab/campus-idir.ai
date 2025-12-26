'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { verifyInstructorAction } from '@/lib/instructor-auth-actions';
import { getCourseStudentsAction, getCourseByIdAction } from '@/lib/course-actions';
import { Instructor } from '@/types/database';
import Cookies from 'js-cookie';

interface Student {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  email: string;
  signup_status: string;
  language: string;
  created_at: string;
  completed_at?: string;
}

export default function CourseStudentsPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params?.courseId as string;

  const [instructor, setInstructor] = useState<Instructor | null>(null);
  const [courseName, setCourseName] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const instructorId = Cookies.get('instructorId');
      const userType = Cookies.get('userType');

      if (!instructorId || userType !== 'instructor') {
        router.push('/instructor/login');
        return;
      }

      try {
        // Verify instructor
        const instructorResult = await verifyInstructorAction(instructorId);
        if (!instructorResult.success || !instructorResult.data) {
          router.push('/instructor/login');
          return;
        }

        setInstructor(instructorResult.data);

        // Get course details
        const courseResult = await getCourseByIdAction(courseId, instructorId);
        if (courseResult.success && courseResult.data) {
          setCourseName(courseResult.data.title);
        }

        // Get students
        const studentsResult = await getCourseStudentsAction(instructorId, courseId);
        if (studentsResult.success && studentsResult.data) {
          setStudents(studentsResult.data);
        } else {
          setError(studentsResult.error || 'Failed to load students');
        }
      } catch (err: any) {
        console.error('Error loading data:', err);
        setError(err.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#10b981] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading students...</p>
        </div>
      </div>
    );
  }

  if (!instructor) {
    return null;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <Link
            href="/instructor/dashboard"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-[#10b981] mb-4 font-semibold transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
            Students Enrolled in <span className="text-[#10b981]">{courseName}</span>
          </h1>
          <p className="text-sm md:text-base text-gray-600 mt-2">
            {students.length} {students.length === 1 ? 'student' : 'students'} enrolled
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-500 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Students List */}
        {students.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <p className="text-gray-600 font-semibold">No students enrolled yet</p>
            <p className="text-sm text-gray-500 mt-1">Students will appear here once they sign up for this course.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 emerald-accent-left shadow-sm overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Student
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Email
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Enrolled
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Language
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {students.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center border-2 border-emerald-200">
                            <span className="text-xs font-bold text-[#10b981]">
                              {getInitials(student.first_name, student.last_name)}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {student.first_name} {student.last_name}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <a href={`mailto:${student.email}`} className="text-sm text-gray-600 hover:text-[#10b981] transition-colors">
                          {student.email}
                        </a>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${
                          student.signup_status === 'completed'
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : student.signup_status === 'in_progress'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-gray-50 text-gray-700 border border-gray-200'
                        }`}>
                          {student.signup_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(student.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs font-semibold text-gray-600 uppercase">
                          {student.language}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-200">
              {students.map((student) => (
                <div key={student.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center border-2 border-emerald-200 flex-shrink-0">
                      <span className="text-sm font-bold text-[#10b981]">
                        {getInitials(student.first_name, student.last_name)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 mb-1">
                        {student.first_name} {student.last_name}
                      </p>
                      <a href={`mailto:${student.email}`} className="text-xs text-gray-600 hover:text-[#10b981] transition-colors block mb-2 truncate">
                        {student.email}
                      </a>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className={`px-2 py-1 font-semibold rounded ${
                          student.signup_status === 'completed'
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : student.signup_status === 'in_progress'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-gray-50 text-gray-700 border border-gray-200'
                        }`}>
                          {student.signup_status}
                        </span>
                        <span className="text-gray-500">•</span>
                        <span className="text-gray-600">
                          {formatDate(student.created_at)}
                        </span>
                        <span className="text-gray-500">•</span>
                        <span className="text-gray-600 uppercase font-semibold">
                          {student.language}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
