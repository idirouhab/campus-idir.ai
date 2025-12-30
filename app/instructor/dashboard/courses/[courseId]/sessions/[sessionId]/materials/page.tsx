'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useInstructorAuth } from '@/hooks/useInstructorAuth';
import SessionMaterialsManager from '@/components/courses/SessionMaterialsManager';
import { getCourseByIdAction } from '@/lib/course-actions';
import { getCourseSessionsAction } from '@/lib/session-actions';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default function SessionMaterialsPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params?.courseId as string;
  const sessionId = params?.sessionId as string;
  const { instructor: currentInstructor, loading: authLoading, csrfToken } = useInstructorAuth();

  const [courseName, setCourseName] = useState('');
  const [sessionTitle, setSessionTitle] = useState('');
  const [loading, setLoading] = useState(false);

  // Check authentication
  useEffect(() => {
    if (!authLoading && !currentInstructor) {
      router.push('/instructor/login');
    }
  }, [currentInstructor, authLoading, router]);

  // Fetch course and session info
  useEffect(() => {
    const fetchData = async () => {
      if (!currentInstructor || !courseId || !sessionId) return;

      setLoading(true);
      try {
        // Fetch course name
        const courseResult = await getCourseByIdAction(courseId);
        if (courseResult.success && courseResult.data) {
          setCourseName(courseResult.data.title);
        }

        // Fetch session info
        const sessionsResult = await getCourseSessionsAction(courseId);
        if (sessionsResult.success && sessionsResult.data) {
          const session = sessionsResult.data.find((s) => s.id === sessionId);
          if (session) {
            setSessionTitle(session.title);
          }
        }
      } catch (err: any) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentInstructor, courseId, sessionId]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/instructor/dashboard/courses/${courseId}/sessions`}
          className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 mb-4"
        >
          <ChevronLeft size={20} />
          Back to Sessions
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Session Materials</h1>
        {courseName && <p className="text-gray-600">Course: {courseName}</p>}
        {sessionTitle && <p className="text-gray-600 font-semibold">Session: {sessionTitle}</p>}
      </div>

      {/* Session Materials Manager */}
      <SessionMaterialsManager
        courseId={courseId}
        sessionId={sessionId}
        csrfToken={csrfToken}
      />
    </div>
  );
}
