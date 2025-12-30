'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { verifyInstructorAction } from '@/lib/instructor-auth-actions';
import { getCourseStudentsAction, getCourseByIdAction, updateStudentStatusAction, deleteStudentFromCourseAction } from '@/lib/course-actions';
import { Instructor } from '@/types/database';

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

type SortOption = 'name_asc' | 'name_desc' | 'date_asc' | 'date_desc' | 'status_asc' | 'status_desc';

export default function CourseStudentsPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params?.courseId as string;

  const [instructor, setInstructor] = useState<Instructor | null>(null);
  const [courseName, setCourseName] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filter and sort state
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date_desc');
  const [searchQuery, setSearchQuery] = useState('');

  // Action state
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Check session using the same method as dashboard
        const response = await fetch('/api/auth/session', {
          credentials: 'include',
        });

        if (!response.ok) {
          router.push('/instructor/login');
          return;
        }

        const data = await response.json();

        if (!data.user || data.user.userType !== 'instructor') {
          router.push('/instructor/login');
          return;
        }

        // Fetch full instructor profile data
        const instructorResult = await verifyInstructorAction(data.user.id);
        if (!instructorResult.success || !instructorResult.data) {
          router.push('/instructor/login');
          return;
        }

        setInstructor(instructorResult.data);

        // Get course details
        const courseResult = await getCourseByIdAction(courseId);
        if (courseResult.success && courseResult.data) {
          setCourseName(courseResult.data.title);
        }

        // Get students
        const studentsResult = await getCourseStudentsAction(courseId);
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

  // Handle status update
  const handleStatusChange = async (signupId: string, newStatus: 'pending' | 'confirmed' | 'enrolled') => {
    setUpdatingStatusId(signupId);
    setError(null);
    setSuccess(null);

    try {
      const result = await updateStudentStatusAction(signupId, newStatus);
      if (result.success) {
        // Update local state
        setStudents(students.map(s =>
          s.id === signupId ? { ...s, signup_status: newStatus } : s
        ));
        setSuccess('Status updated successfully');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || 'Failed to update status');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // Handle delete
  const handleDelete = async (signupId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to remove ${studentName} from this course? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(signupId);
    setError(null);
    setSuccess(null);

    try {
      const result = await deleteStudentFromCourseAction(signupId);
      if (result.success) {
        // Remove from local state
        setStudents(students.filter(s => s.id !== signupId));
        setSuccess('Student removed successfully');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || 'Failed to delete student');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setDeletingId(null);
    }
  };

  // Filter and sort students
  const filteredAndSortedStudents = useMemo(() => {
    let filtered = students;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.first_name.toLowerCase().includes(query) ||
        s.last_name.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.signup_status === statusFilter);
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name_asc':
          return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
        case 'name_desc':
          return `${b.first_name} ${b.last_name}`.localeCompare(`${a.first_name} ${a.last_name}`);
        case 'date_asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'date_desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'status_asc':
          return a.signup_status.localeCompare(b.signup_status);
        case 'status_desc':
          return b.signup_status.localeCompare(a.signup_status);
        default:
          return 0;
      }
    });

    return sorted;
  }, [students, statusFilter, sortBy, searchQuery]);

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

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'enrolled':
        return 'bg-green-50 text-green-700 border border-green-200';
      case 'confirmed':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
      default:
        return 'bg-gray-50 text-gray-700 border border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-8">
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
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight mb-4">
            Students Enrolled in <span className="text-[#10b981]">{courseName}</span>
          </h1>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mb-4">
            <nav className="-mb-px flex space-x-8">
              <button
                type="button"
                onClick={() => router.push(`/instructor/dashboard/courses/${courseId}/edit`)}
                className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors"
              >
                Edit Course
              </button>
              <button
                type="button"
                onClick={() => router.push(`/instructor/dashboard/courses/${courseId}/materials`)}
                className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors"
              >
                Materials
              </button>
              <button
                type="button"
                onClick={() => router.push(`/instructor/dashboard/courses/${courseId}/sessions`)}
                className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors"
              >
                Sessions
              </button>
              <button
                type="button"
                className="border-b-2 border-[#10b981] py-4 px-1 text-sm font-medium text-[#10b981]"
              >
                Students
              </button>
            </nav>
          </div>

          <p className="text-sm md:text-base text-gray-600 mt-2">
            {filteredAndSortedStudents.length} of {students.length} {students.length === 1 ? 'student' : 'students'}
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="bg-emerald-50 border border-[#10b981] rounded-lg p-4 mb-6">
            <p className="text-sm text-[#10b981] font-semibold">{success}</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-500 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {students.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <p className="text-gray-600 font-semibold">No students enrolled yet</p>
            <p className="text-sm text-gray-500 mt-1">Students will appear here once they sign up for this course.</p>
          </div>
        ) : (
          <>
            {/* Filter Bar */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Search */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                    Search
                  </label>
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent text-sm"
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                    Filter by Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent text-sm"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="enrolled">Enrolled</option>
                  </select>
                </div>

                {/* Sort */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                    Sort By
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="w-full px-4 py-2 border border-gray-200 bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent text-sm"
                  >
                    <option value="date_desc">Newest First</option>
                    <option value="date_asc">Oldest First</option>
                    <option value="name_asc">Name (A-Z)</option>
                    <option value="name_desc">Name (Z-A)</option>
                    <option value="status_asc">Status (A-Z)</option>
                    <option value="status_desc">Status (Z-A)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Students List */}
            {filteredAndSortedStudents.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-gray-600 font-semibold">No students match your filters</p>
                <p className="text-sm text-gray-500 mt-1">Try adjusting your search or filter criteria.</p>
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
                        <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredAndSortedStudents.map((student) => (
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
                            <select
                              value={student.signup_status}
                              onChange={(e) => handleStatusChange(student.id, e.target.value as any)}
                              disabled={updatingStatusId === student.id}
                              className={`px-2 py-1 text-xs font-semibold rounded border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#10b981] disabled:opacity-50 disabled:cursor-not-allowed ${getStatusBadgeClass(student.signup_status)}`}
                            >
                              <option value="pending">Pending</option>
                              <option value="confirmed">Confirmed</option>
                              <option value="enrolled">Enrolled</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {formatDate(student.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-xs font-semibold text-gray-600 uppercase">
                              {student.language}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            {/* Delete Button */}
                            <button
                              onClick={() => handleDelete(student.id, `${student.first_name} ${student.last_name}`)}
                              disabled={deletingId === student.id}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Remove student"
                            >
                              {deletingId === student.id ? (
                                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-gray-200">
                  {filteredAndSortedStudents.map((student) => (
                    <div key={student.id} className="p-4">
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
                          <div className="flex flex-wrap items-center gap-2 text-xs mb-3">
                            <select
                              value={student.signup_status}
                              onChange={(e) => handleStatusChange(student.id, e.target.value as any)}
                              disabled={updatingStatusId === student.id}
                              className={`px-2 py-1 font-semibold rounded border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#10b981] disabled:opacity-50 disabled:cursor-not-allowed ${getStatusBadgeClass(student.signup_status)}`}
                            >
                              <option value="pending">Pending</option>
                              <option value="confirmed">Confirmed</option>
                              <option value="enrolled">Enrolled</option>
                            </select>
                            <span className="text-gray-500">•</span>
                            <span className="text-gray-600">
                              {formatDate(student.created_at)}
                            </span>
                            <span className="text-gray-500">•</span>
                            <span className="text-gray-600 uppercase font-semibold">
                              {student.language}
                            </span>
                          </div>

                          {/* Mobile Actions */}
                          <button
                            onClick={() => handleDelete(student.id, `${student.first_name} ${student.last_name}`)}
                            disabled={deletingId === student.id}
                            className="w-full px-3 py-1.5 text-xs font-semibold text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                          >
                            {deletingId === student.id ? 'Removing...' : 'Remove Student'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
