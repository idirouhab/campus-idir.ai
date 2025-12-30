'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useInstructorAuth } from '@/hooks/useInstructorAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { CourseSession } from '@/types/database';
import SessionBuilder from '@/components/courses/SessionBuilder';
import {
  getCourseSessionsAction,
  createSessionAction,
  updateSessionAction,
  deleteSessionAction,
  reorderSessionsAction,
} from '@/lib/session-actions';
import { getCourseByIdAction } from '@/lib/course-actions';
import { Save } from 'lucide-react';

export default function ManageCourseSessionsPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params?.courseId as string;
  const { instructor: currentInstructor, loading: authLoading, csrfToken } = useInstructorAuth();
  const { t } = useLanguage();

  const [courseName, setCourseName] = useState('');
  const [sessions, setSessions] = useState<CourseSession[]>([]);
  const [originalSessions, setOriginalSessions] = useState<CourseSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Check authentication
  useEffect(() => {
    if (!authLoading && !currentInstructor) {
      router.push('/instructor/login');
    }
  }, [currentInstructor, authLoading, router]);

  // Fetch course name and sessions
  useEffect(() => {
    const fetchData = async () => {
      if (!currentInstructor || !courseId) return;

      setLoading(true);
      try {
        // Fetch course name
        const courseResult = await getCourseByIdAction(courseId);
        if (courseResult.success && courseResult.data) {
          setCourseName(courseResult.data.title);
        }

        // Fetch sessions
        const sessionsResult = await getCourseSessionsAction(courseId);
        if (sessionsResult.success && sessionsResult.data) {
          setSessions(sessionsResult.data);
          setOriginalSessions(JSON.parse(JSON.stringify(sessionsResult.data)));
        }
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(t('instructor.sessions.errorMessage'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentInstructor, courseId]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Compare with original to determine creates, updates, deletes
      const originalIds = new Set(originalSessions.map((s) => s.id));
      const currentIds = new Set(sessions.map((s) => s.id).filter((id) => !id.startsWith('temp-')));

      // Find sessions to delete (in original but not in current)
      const toDelete = originalSessions.filter((s) => !currentIds.has(s.id));

      // Find sessions to create (temp IDs)
      const toCreate = sessions.filter((s) => s.id.startsWith('temp-'));

      // Find sessions to update (existing IDs)
      const toUpdate = sessions.filter((s) => !s.id.startsWith('temp-') && currentIds.has(s.id));

      // Delete sessions
      for (const session of toDelete) {
        const result = await deleteSessionAction(session.id);
        if (!result.success) {
          throw new Error(result.error || 'Failed to delete session');
        }
      }

      // Create new sessions
      const createdSessions: CourseSession[] = [];
      for (const session of toCreate) {
        const result = await createSessionAction({
          courseId,
          title: session.title,
          description: session.description,
          sessionDate: session.session_date,
          durationMinutes: session.duration_minutes,
          timezone: session.timezone,
          displayOrder: session.display_order,
        });

        if (!result.success || !result.data) {
          throw new Error(result.error || 'Failed to create session');
        }

        createdSessions.push(result.data);
      }

      // Update existing sessions
      for (const session of toUpdate) {
        const result = await updateSessionAction(session.id, {
          title: session.title,
          description: session.description,
          sessionDate: session.session_date,
          durationMinutes: session.duration_minutes,
          timezone: session.timezone,
          displayOrder: session.display_order,
        });

        if (!result.success) {
          throw new Error(result.error || 'Failed to update session');
        }
      }

      // Reorder all sessions
      const allSessionIds = [
        ...toUpdate.map((s) => s.id),
        ...createdSessions.map((s) => s.id),
      ];

      if (allSessionIds.length > 0) {
        const sessionOrders = allSessionIds.map((id, index) => ({
          id,
          display_order: index,
        }));

        await reorderSessionsAction(courseId, sessionOrders);
      }

      // Refetch sessions
      const sessionsResult = await getCourseSessionsAction(courseId);
      if (sessionsResult.success && sessionsResult.data) {
        setSessions(sessionsResult.data);
        setOriginalSessions(JSON.parse(JSON.stringify(sessionsResult.data)));
      }

      setSuccess(t('instructor.sessions.successMessage'));
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      console.error('Error saving sessions:', err);
      setError(err.message || t('instructor.sessions.errorMessage'));
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-8">
        <div className="mb-6">
          <Link
            href="/instructor/dashboard"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-[#10b981] mb-4 font-semibold transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t('instructor.common.backToDashboard')}
          </Link>
          <h1 className="text-3xl font-black text-gray-900 mb-2">{t('instructor.sessions.title')}</h1>
          <p className="text-gray-600 mb-4">
            {t('instructor.sessions.sessionsFor')} <span className="font-semibold text-[#10b981]">{courseName || t('course.notFound')}</span>
          </p>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              type="button"
              onClick={() => router.push(`/instructor/dashboard/courses/${courseId}/edit`)}
              className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors"
            >
              {t('instructor.editCourse.tabs.editCourse')}
            </button>
            <button
              type="button"
              onClick={() => router.push(`/instructor/dashboard/courses/${courseId}/materials`)}
              className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors"
            >
              {t('instructor.editCourse.tabs.materials')}
            </button>
            <button
              type="button"
              className="border-b-2 border-[#10b981] py-4 px-1 text-sm font-medium text-[#10b981]"
            >
              {t('instructor.editCourse.tabs.sessions')}
            </button>
            <button
              type="button"
              onClick={() => router.push(`/instructor/dashboard/courses/${courseId}/students`)}
              className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors"
            >
              {t('instructor.editCourse.tabs.students')}
            </button>
          </nav>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg">
          {success}
        </div>
      )}

      {/* Session Builder */}
      <div className="mb-8">
        <SessionBuilder
          sessions={sessions}
          onChange={setSessions}
          courseId={courseId}
          defaultTimezone={currentInstructor?.timezone || 'Euope/Madrid'}
          csrfToken={csrfToken || undefined}
        />
      </div>

      {/* Save Button */}
      <div className="sticky bottom-4 flex justify-end gap-4 bg-white p-4 rounded-lg shadow-lg border border-gray-200">
        <button
          type="button"
          onClick={() => router.push(`/instructor/dashboard/courses/${courseId}/edit`)}
          className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
        >
          {t('instructor.common.cancel')}
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
              {t('instructor.sessions.saving')}
            </>
          ) : (
            <>
              <Save size={20} />
              {t('instructor.sessions.saveSession')}
            </>
          )}
        </button>
      </div>
      </main>
    </div>
  );
}
