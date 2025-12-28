'use server';

import { getDb } from '@/lib/db';
import { Course, CourseSignup, StudentCourseAccess } from '@/types/database';
import { requireUserType } from '@/lib/session';

interface CoursesResponse {
  success: boolean;
  data?: StudentCourseAccess[];
  error?: string;
}

interface CourseAccessResponse {
  success: boolean;
  hasAccess: boolean;
  courseSignupId?: string;
  error?: string;
}

export async function getStudentCoursesAction(): Promise<CoursesResponse> {
  try {
    // Verify session and get student
    const session = await requireUserType('student');
    const studentId = session.id;

    const sql = getDb();

    // Query to get all courses the student is enrolled in
    const result = await sql`
      SELECT
        cs.id as signup_id,
        cs.student_id,
        cs.course_id,
        cs.signup_status,
        cs.language as signup_language,
        cs.created_at as signup_created_at,
        cs.updated_at as signup_updated_at,
        cs.completed_at,
        cs.certificate_id,
        cs.certificate_url,
        c.*
      FROM course_signups cs
      INNER JOIN courses c ON cs.course_id = c.id
      WHERE cs.student_id = ${studentId}
        AND c.status = 'published'
      ORDER BY cs.created_at DESC
    `;

    console.log('[getStudentCourses] Found', result.length, 'courses');

    // Transform to StudentCourseAccess format
    const courses: StudentCourseAccess[] = result.map((row: any) => ({
      course: {
        id: row.id,
        slug: row.slug,
        title: row.title,
        short_description: row.short_description,
        course_data: row.course_data,
        cover_image: row.cover_image,
        meta_title: row.meta_title,
        meta_description: row.meta_description,
        language: row.language,
        status: row.status,
        published_at: row.published_at,
        enrollment_count: row.enrollment_count,
        view_count: row.view_count,
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
      signup: {
        id: row.signup_id,
        student_id: row.student_id,
        course_id: row.course_id,
        signup_status: row.signup_status,
        language: row.signup_language,
        created_at: row.signup_created_at,
        updated_at: row.signup_updated_at,
        completed_at: row.completed_at,
        certificate_id: row.certificate_id,
        certificate_url: row.certificate_url,
      }
    }));

    return { success: true, data: courses };
  } catch (error: any) {
    console.error('[getStudentCourses] Error:', error);
    return { success: false, error: error.message || 'Failed to fetch courses' };
  }
}

export async function checkCourseAccessAction(
    courseSlug: string | undefined
): Promise<CourseAccessResponse> {
  try {
    if (!courseSlug) {
      return { success: true, hasAccess: false };
    }

    // Verify session and get student
    const session = await requireUserType('student');
    const studentId = session.id;

    const sql = getDb();

    // Check if student has access to this course
    const result = await sql`
      SELECT cs.id
      FROM course_signups cs
      INNER JOIN courses c ON cs.course_id = c.id
      WHERE cs.student_id = ${studentId}
        AND c.slug = ${courseSlug}
      LIMIT 1
    `;

    return {
      success: true,
      hasAccess: result.length > 0,
      courseSignupId: result.length > 0 ? result[0].id : undefined
    };
  } catch (error: any) {
    console.error('[checkCourseAccess] Error:', error);
    return {
      success: false,
      hasAccess: false,
      error: error.message || 'Failed to check access'
    };
  }
}

export async function getCourseBySlugAction(courseSlug: string | undefined): Promise<{
    success: boolean;
    data?: Course;
    error?: string
}> {
  try {
    if (!courseSlug) {
      return { success: false, error: 'Course slug is required' };
    }

    const sql = getDb();

    const result = await sql`
      SELECT *
      FROM courses
      WHERE slug = ${courseSlug}
        AND status = 'published'
      LIMIT 1
    `;

    if (result.length === 0) {
      return { success: false, error: 'Course not found' };
    }

    const row = result[0];
    const course: Course = {
      id: row.id,
      slug: row.slug,
      title: row.title,
      short_description: row.short_description,
      course_data: row.course_data,
      cover_image: row.cover_image,
      meta_title: row.meta_title,
      meta_description: row.meta_description,
      language: row.language,
      status: row.status,
      published_at: row.published_at,
      enrollment_count: row.enrollment_count,
      view_count: row.view_count,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };

    return { success: true, data: course };
  } catch (error: any) {
    console.error('[getCourseBySlug] Error:', error);
    return { success: false, error: error.message || 'Failed to fetch course' };
  }
}
