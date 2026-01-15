'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { verifyInstructorAction } from '@/lib/instructor-auth-actions';
import { getCourseByIdAction } from '@/lib/course-actions';
import { getCourseSessionsAction } from '@/lib/session-actions';
import {
  getSessionAttendanceAction,
  markAttendanceAction,
  bulkMarkAttendanceAction,
  getCourseAttendanceSummaryAction,
} from '@/lib/attendance-actions';
import { Instructor, CourseSession, AttendanceRecord, SessionAttendanceSummary } from '@/types/database';
import LoadingOverlay from '@/components/LoadingOverlay';

export default function CourseAttendancePage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params?.courseId as string;
  const { t } = useLanguage();

  const [instructor, setInstructor] = useState<Instructor | null>(null);
  const [courseName, setCourseName] = useState<string>('');
  const [courseSlug, setCourseSlug] = useState<string>('');
  const [sessions, setSessions] = useState<CourseSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<SessionAttendanceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'absent'>('all');
  const [updatingStudentId, setUpdatingStudentId] = useState<string | null>(null);
  const [bulkMarking, setBulkMarking] = useState(false);

  // Authentication check
  useEffect(() => {
    const fetchData = async () => {
      try {
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
          setCourseSlug(courseResult.data.slug);
        }

        // Get sessions
        const sessionsResult = await getCourseSessionsAction(courseId);
        if (sessionsResult.success && sessionsResult.data) {
          setSessions(sessionsResult.data);
          // Auto-select first session
          if (sessionsResult.data.length > 0) {
            setSelectedSessionId(sessionsResult.data[0].id);
          }
        }

        // Get attendance summary
        const summaryResult = await getCourseAttendanceSummaryAction(courseId);
        if (summaryResult.success && summaryResult.data) {
          setAttendanceSummary(summaryResult.data);
        }
      } catch (err: any) {
        console.error('Error loading data:', err);
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId, router]);

  // Fetch attendance when session changes
  useEffect(() => {
    const fetchAttendance = async () => {
      if (!selectedSessionId) {
        setAttendanceRecords([]);
        return;
      }

      setLoadingAttendance(true);
      try {
        const result = await getSessionAttendanceAction(selectedSessionId);
        if (result.success && result.data) {
          setAttendanceRecords(result.data);
        } else {
          setError(result.error || 'Failed to load attendance');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load attendance');
      } finally {
        setLoadingAttendance(false);
      }
    };

    fetchAttendance();
  }, [selectedSessionId]);

  // Handle individual attendance toggle
  const handleToggleAttendance = async (studentId: string, currentStatus: string) => {
    setUpdatingStudentId(studentId);
    setError(null);
    setSuccess(null);

    const newStatus = currentStatus === 'present' ? 'absent' : 'present';

    try {
      const result = await markAttendanceAction(selectedSessionId, studentId, newStatus);
      if (result.success) {
        // Update local state
        setAttendanceRecords(records =>
          records.map(r =>
            r.student_id === studentId
              ? { ...r, attendance_status: newStatus }
              : r
          )
        );
        setSuccess(`Attendance marked as ${newStatus}`);
        setTimeout(() => setSuccess(null), 2000);

        // Refresh summary
        const summaryResult = await getCourseAttendanceSummaryAction(courseId);
        if (summaryResult.success && summaryResult.data) {
          setAttendanceSummary(summaryResult.data);
        }
      } else {
        setError(result.error || 'Failed to mark attendance');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to mark attendance');
    } finally {
      setUpdatingStudentId(null);
    }
  };

  // Handle bulk mark all
  const handleBulkMark = async (status: 'present' | 'absent') => {
    if (!confirm(`Mark all students as ${status}?`)) return;

    setBulkMarking(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await bulkMarkAttendanceAction(selectedSessionId, status);
      if (result.success) {
        // Refresh attendance
        const attendanceResult = await getSessionAttendanceAction(selectedSessionId);
        if (attendanceResult.success && attendanceResult.data) {
          setAttendanceRecords(attendanceResult.data);
        }

        // Refresh summary
        const summaryResult = await getCourseAttendanceSummaryAction(courseId);
        if (summaryResult.success && summaryResult.data) {
          setAttendanceSummary(summaryResult.data);
        }

        setSuccess(`Marked ${result.count} students as ${status}`);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || 'Failed to bulk mark attendance');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to bulk mark attendance');
    } finally {
      setBulkMarking(false);
    }
  };

  // Filter and search
  const filteredAttendance = useMemo(() => {
    let filtered = attendanceRecords;

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.student_first_name.toLowerCase().includes(query) ||
        r.student_last_name.toLowerCase().includes(query) ||
        r.student_email.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.attendance_status === statusFilter);
    }

    return filtered;
  }, [attendanceRecords, searchQuery, statusFilter]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const selectedSession = sessions.find(s => s.id === selectedSessionId);
  const currentSummary = attendanceSummary.find(s => s.session_id === selectedSessionId);

  if (loading) {
    return <LoadingOverlay fullScreen={false} message="Loading attendance..." />;
  }

  if (!instructor) {
    return null;
  }

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
            Attendance for <span className="text-[#10b981]">{courseName}</span>
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
                onClick={() => router.push(`/instructor/dashboard/courses/${courseId}/students`)}
                className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors"
              >
                Students
              </button>
              <button
                type="button"
                className="border-b-2 border-[#10b981] py-4 px-1 text-sm font-medium text-[#10b981]"
              >
                Attendance
              </button>
              <button
                type="button"
                onClick={() => router.push(`/course/${courseSlug}/forum`)}
                className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors"
              >
                Forum
              </button>
            </nav>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="bg-emerald-50 border border-[#10b981] rounded-lg p-4 mb-6">
            <p className="text-sm text-[#10b981] font-semibold">{success}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-500 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Session Selector & Summary */}
        {sessions.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-600 font-semibold">No sessions configured</p>
            <p className="text-sm text-gray-500 mt-1">Create sessions first to track attendance</p>
            <button
              onClick={() => router.push(`/instructor/dashboard/courses/${courseId}/sessions`)}
              className="mt-4 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
            >
              Go to Sessions
            </button>
          </div>
        ) : (
          <>
            {/* Session Selector */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                    Select Session
                  </label>
                  <select
                    value={selectedSessionId}
                    onChange={(e) => setSelectedSessionId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent text-sm"
                  >
                    {sessions.map((session, index) => (
                      <option key={session.id} value={session.id}>
                        Session {index + 1}: {session.title} - {formatDate(session.session_date)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Attendance Summary for Selected Session */}
                {currentSummary && (
                  <div className="flex items-end">
                    <div className="w-full p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-gray-700 uppercase">Attendance</p>
                          <p className="text-2xl font-black text-[#10b981]">
                            {currentSummary.attendance_percentage}%
                          </p>
                        </div>
                        <div className="text-right text-sm text-gray-600">
                          <p>{currentSummary.present_count} present</p>
                          <p>{currentSummary.absent_count} absent</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bulk Actions & Filters */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 shadow-sm">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-end justify-between">
                {/* Search & Filter */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                      Search Students
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

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                      Filter by Status
                    </label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                      className="w-full px-4 py-2 border border-gray-200 bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent text-sm"
                    >
                      <option value="all">All Students</option>
                      <option value="present">Present Only</option>
                      <option value="absent">Absent Only</option>
                    </select>
                  </div>
                </div>

                {/* Bulk Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleBulkMark('present')}
                    disabled={bulkMarking || loadingAttendance}
                    className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium whitespace-nowrap"
                  >
                    {bulkMarking ? 'Marking...' : 'Mark All Present'}
                  </button>
                  <button
                    onClick={() => handleBulkMark('absent')}
                    disabled={bulkMarking || loadingAttendance}
                    className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium whitespace-nowrap"
                  >
                    {bulkMarking ? 'Marking...' : 'Mark All Absent'}
                  </button>
                </div>
              </div>
            </div>

            {/* Attendance List */}
            {loadingAttendance ? (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#10b981] mx-auto mb-4"></div>
                <p className="text-gray-600">Loading attendance...</p>
              </div>
            ) : filteredAttendance.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <p className="text-gray-600 font-semibold">No students found</p>
                <p className="text-sm text-gray-500 mt-1">
                  {searchQuery || statusFilter !== 'all' ? 'Try adjusting your filters' : 'No students enrolled in this course'}
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
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
                        <th scope="col" className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredAttendance.map((record) => (
                        <tr key={record.student_id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center border-2 border-emerald-200">
                                <span className="text-xs font-bold text-[#10b981]">
                                  {getInitials(record.student_first_name, record.student_last_name)}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-gray-900">
                                  {record.student_first_name} {record.student_last_name}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <a href={`mailto:${record.student_email}`} className="text-sm text-gray-600 hover:text-[#10b981] transition-colors">
                              {record.student_email}
                            </a>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                              record.attendance_status === 'present'
                                ? 'bg-green-100 text-green-800 border border-green-200'
                                : 'bg-red-100 text-red-800 border border-red-200'
                            }`}>
                              {record.attendance_status === 'present' ? (
                                <>
                                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Present
                                </>
                              ) : (
                                <>
                                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                  Absent
                                </>
                              )}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <button
                              onClick={() => handleToggleAttendance(record.student_id, record.attendance_status)}
                              disabled={updatingStudentId === record.student_id}
                              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                record.attendance_status === 'present'
                                  ? 'bg-red-600 text-white hover:bg-red-700'
                                  : 'bg-green-600 text-white hover:bg-green-700'
                              }`}
                            >
                              {updatingStudentId === record.student_id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mx-auto"></div>
                              ) : record.attendance_status === 'present' ? (
                                'Mark Absent'
                              ) : (
                                'Mark Present'
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
                  {filteredAttendance.map((record) => (
                    <div key={record.student_id} className="p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center border-2 border-emerald-200 flex-shrink-0">
                          <span className="text-sm font-bold text-[#10b981]">
                            {getInitials(record.student_first_name, record.student_last_name)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 mb-1">
                            {record.student_first_name} {record.student_last_name}
                          </p>
                          <a href={`mailto:${record.student_email}`} className="text-xs text-gray-600 hover:text-[#10b981] transition-colors block mb-2 truncate">
                            {record.student_email}
                          </a>
                          <div className="mb-3">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                              record.attendance_status === 'present'
                                ? 'bg-green-100 text-green-800 border border-green-200'
                                : 'bg-red-100 text-red-800 border border-red-200'
                            }`}>
                              {record.attendance_status === 'present' ? (
                                <>
                                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Present
                                </>
                              ) : (
                                <>
                                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                  Absent
                                </>
                              )}
                            </span>
                          </div>
                          <button
                            onClick={() => handleToggleAttendance(record.student_id, record.attendance_status)}
                            disabled={updatingStudentId === record.student_id}
                            className={`w-full px-4 py-3 min-h-[44px] text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                              record.attendance_status === 'present'
                                ? 'bg-red-600 text-white hover:bg-red-700'
                                : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                          >
                            {updatingStudentId === record.student_id ? (
                              'Updating...'
                            ) : record.attendance_status === 'present' ? (
                              'Mark Absent'
                            ) : (
                              'Mark Present'
                            )}
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
