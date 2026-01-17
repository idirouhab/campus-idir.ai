import { Course, CourseMaterial, CourseSession, Instructor, StudentCourseAccess } from '@/types/database';

/**
 * Shared query functions for courses
 * These functions are used with React Query for caching and data fetching
 */

// Fetch course by slug
export async function fetchCourseBySlug(slug: string): Promise<Course> {
  const response = await fetch(`/api/courses/by-slug/${slug}`);
  if (!response.ok) {
    throw new Error('Failed to fetch course');
  }
  const data = await response.json();
  return data.course;
}

// Check course access for a student
export async function fetchCourseAccess(
  slug: string,
  userId?: string
): Promise<{ hasAccess: boolean }> {
  if (!userId || !slug) {
    return { hasAccess: false };
  }

  const response = await fetch(`/api/courses/by-slug/${slug}/check-access`);
  if (!response.ok) {
    return { hasAccess: false };
  }
  const data = await response.json();
  return { hasAccess: data.hasAccess };
}

// Fetch course materials
export async function fetchCourseMaterials(
  courseId: string
): Promise<CourseMaterial[]> {
  const response = await fetch(`/api/courses/${courseId}/materials/public`);
  if (!response.ok) {
    throw new Error('Failed to fetch materials');
  }
  const data = await response.json();
  return data.materials || [];
}

// Fetch course sessions
export async function fetchCourseSessions(
  courseId: string
): Promise<CourseSession[]> {
  const response = await fetch(`/api/courses/${courseId}/sessions/public`);
  if (!response.ok) {
    throw new Error('Failed to fetch sessions');
  }
  const data = await response.json();
  return data.sessions || [];
}

// Fetch course instructors
export async function fetchCourseInstructors(
  courseId: string
): Promise<Array<Instructor & { instructor_role: string; display_order: number }>> {
  const response = await fetch(`/api/courses/${courseId}/instructors`);
  if (!response.ok) {
    return [];
  }
  const data = await response.json();
  return data.instructors || [];
}

// Check instructor access to a course
export async function fetchInstructorCourseAccess(
  courseId: string
): Promise<{ hasAccess: boolean }> {
  const response = await fetch(`/api/courses/${courseId}/check-instructor-access`);
  if (!response.ok) {
    return { hasAccess: false };
  }
  const data = await response.json();
  return { hasAccess: data.hasAccess || false };
}

// Fetch student courses (for dashboard)
export async function fetchStudentCourses(
  userId?: string
): Promise<StudentCourseAccess[]> {
  if (!userId) return [];

  // Import from the correct file (courses-actions, not course-actions)
  const { getStudentCoursesAction } = await import('@/lib/courses-actions');
  const result = await getStudentCoursesAction();

  if (!result.success || !result.data) {
    return [];
  }

  return result.data;
}
