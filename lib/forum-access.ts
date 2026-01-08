'use server';

import { getDb } from './db';
import { SessionUser } from './session';

export interface CourseAccessResult {
  hasAccess: boolean;
  isInstructor: boolean;
  isStudent: boolean;
}

/**
 * Check if user has access to course forum
 * User must be enrolled as student OR assigned as instructor
 */
export async function checkCourseForumAccess(
  userId: string,
  courseId: string
): Promise<CourseAccessResult> {
  const sql = getDb();

  // Check if user is enrolled as student
  const studentEnrollment = await sql`
    SELECT 1 FROM course_signups
    WHERE course_id = ${courseId} AND student_id = ${userId}
    LIMIT 1
  `;

  // Check if user is assigned as instructor
  const instructorAssignment = await sql`
    SELECT 1 FROM course_instructors
    WHERE course_id = ${courseId} AND instructor_id = ${userId}
    LIMIT 1
  `;

  const isStudent = studentEnrollment.length > 0;
  const isInstructor = instructorAssignment.length > 0;

  return {
    hasAccess: isStudent || isInstructor,
    isInstructor,
    isStudent,
  };
}

/**
 * Require course forum access (throws if denied)
 */
export async function requireCourseForumAccess(
  session: SessionUser,
  courseId: string
): Promise<CourseAccessResult> {
  const access = await checkCourseForumAccess(session.id, courseId);

  if (!access.hasAccess) {
    throw new Error('Forbidden: You must be enrolled in this course to access the forum');
  }

  return access;
}

/**
 * Get instructor email for a course (for private question panel)
 * Returns first instructor's email
 */
export async function getCourseInstructorEmail(courseId: string): Promise<string | null> {
  const sql = getDb();

  const result = await sql`
    SELECT u.email
    FROM course_instructors ci
    JOIN users u ON ci.instructor_id = u.id
    WHERE ci.course_id = ${courseId}
    ORDER BY ci.display_order ASC
    LIMIT 1
  `;

  return result.length > 0 ? result[0].email : null;
}
