import { useState, useEffect } from 'react';
import { Course, StudentCourseAccess } from '@/types/database';
import { getStudentCoursesAction, checkCourseAccessAction, getCourseBySlugAction } from '@/lib/courses-actions';

export function useStudentCourses(studentId: string | undefined) {
  const [courses, setCourses] = useState<StudentCourseAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) {
      setCourses([]);
      setLoading(false);
      return;
    }

    async function fetchEnrolledCourses() {
      try {
        setLoading(true);
        console.log('[useCourses] Fetching courses from session');

        // Call server action to get courses (uses session)
        const result = await getStudentCoursesAction();

        console.log('[useCourses] Server action result:', result);

        if (!result.success || !result.data) {
          setError(result.error || 'Failed to fetch courses');
          setCourses([]);
          setLoading(false);
          return;
        }

        setCourses(result.data);
      } catch (err: any) {
        console.error('[useCourses] Error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchEnrolledCourses();
  }, [studentId]);

  return { courses, loading, error };
}

export function useCourse(slug: string | undefined) {
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setCourse(null);
      setLoading(false);
      return;
    }

    async function fetchCourse() {
      try {
        setLoading(true);

        const result = await getCourseBySlugAction(slug);

        if (!result.success || !result.data) {
          setError(result.error || 'Failed to fetch course');
          setCourse(null);
          return;
        }

        setCourse(result.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchCourse();
  }, [slug]);

  return { course, loading, error };
}

export function useCheckCourseAccess(studentId: string | undefined, courseSlug: string | undefined) {
  const [hasAccess, setHasAccess] = useState(false);
  const [courseSignupId, setCourseSignupId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId || !courseSlug) {
      setHasAccess(false);
      setCourseSignupId(undefined);
      setLoading(false);
      return;
    }

    async function checkAccess() {
      try {
        setLoading(true);

        const result = await checkCourseAccessAction(courseSlug);

        if (result.success) {
          setHasAccess(result.hasAccess);
          setCourseSignupId(result.courseSignupId);
        } else {
          setHasAccess(false);
          setCourseSignupId(undefined);
        }
      } catch {
        setHasAccess(false);
        setCourseSignupId(undefined);
      } finally {
        setLoading(false);
      }
    }

    checkAccess();
  }, [studentId, courseSlug]);

  return { hasAccess, courseSignupId, loading };
}
