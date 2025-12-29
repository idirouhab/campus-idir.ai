'use server';

import { getDb } from '@/lib/db';
import { Instructor, CourseInstructor, CourseInstructorRole } from '@/types/database';
import { canAssignInstructors } from '@/lib/roles';
import { requireAdmin, requireUserType } from '@/lib/session';

/**
 * Assign an instructor to a course
 */
export async function assignInstructorToCourseAction(
  courseId: string,
  instructorId: string,
  role: CourseInstructorRole = 'instructor',
  displayOrder: number = 0
): Promise<{
  success: boolean;
  data?: CourseInstructor;
  error?: string;
}> {
  try {
    // Verify admin permission via session
    await requireAdmin();

    const sql = getDb();

    // Check if course exists
    const courses = await sql`
      SELECT id FROM courses WHERE id = ${courseId}
    `;

    if (courses.length === 0) {
      return { success: false, error: 'Course not found' };
    }

    // Check if instructor exists and is active
    const instructors = await sql`
      SELECT id, is_active FROM users WHERE id = ${instructorId} AND type = 'instructor'
    `;

    if (instructors.length === 0) {
      return { success: false, error: 'Instructor not found' };
    }

    if (!instructors[0].is_active) {
      return { success: false, error: 'Instructor is not active' };
    }

    // Check if already assigned
    const existing = await sql`
      SELECT id FROM course_instructors
      WHERE course_id = ${courseId} AND instructor_id = ${instructorId}
    `;

    if (existing.length > 0) {
      return { success: false, error: 'Instructor is already assigned to this course' };
    }

    // Assign instructor
    const result = await sql`
      INSERT INTO course_instructors (
        course_id,
        instructor_id,
        instructor_role,
        display_order
      )
      VALUES (
        ${courseId},
        ${instructorId},
        ${role},
        ${displayOrder}
      )
      RETURNING *
    `;

    return {
      success: true,
      data: result[0] as CourseInstructor,
    };
  } catch (error: any) {
    console.error('Error assigning instructor:', error);
    return {
      success: false,
      error: error.message || 'Failed to assign instructor',
    };
  }
}

/**
 * Remove an instructor from a course
 */
export async function removeInstructorFromCourseAction(
  courseId: string,
  instructorId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Verify admin permission via session
    await requireAdmin();

    const sql = getDb();

    // Remove assignment
    const result = await sql`
      DELETE FROM course_instructors
      WHERE course_id = ${courseId} AND instructor_id = ${instructorId}
      RETURNING id
    `;

    if (result.length === 0) {
      return { success: false, error: 'Assignment not found' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error removing instructor:', error);
    return {
      success: false,
      error: error.message || 'Failed to remove instructor',
    };
  }
}

/**
 * Update instructor role in a course
 */
export async function updateCourseInstructorRoleAction(
  courseId: string,
  instructorId: string,
  newRole: CourseInstructorRole,
  newDisplayOrder?: number
): Promise<{
  success: boolean;
  data?: CourseInstructor;
  error?: string;
}> {
  try {
    // Verify admin permission via session
    await requireAdmin();

    const sql = getDb();

    // Update role and optionally display order
    const result = newDisplayOrder !== undefined
      ? await sql`
          UPDATE course_instructors
          SET instructor_role = ${newRole},
              display_order = ${newDisplayOrder},
              updated_at = NOW()
          WHERE course_id = ${courseId} AND instructor_id = ${instructorId}
          RETURNING *
        `
      : await sql`
          UPDATE course_instructors
          SET instructor_role = ${newRole},
              updated_at = NOW()
          WHERE course_id = ${courseId} AND instructor_id = ${instructorId}
          RETURNING *
        `;

    if (result.length === 0) {
      return { success: false, error: 'Assignment not found' };
    }

    return {
      success: true,
      data: result[0] as CourseInstructor,
    };
  } catch (error: any) {
    console.error('Error updating instructor role:', error);
    return {
      success: false,
      error: error.message || 'Failed to update instructor role',
    };
  }
}

/**
 * Get all course assignments for an instructor
 */
export async function getInstructorAssignmentsAction(): Promise<{
  success: boolean;
  data?: Array<CourseInstructor & { course_title: string }>;
  error?: string;
}> {
  try {
    // Verify session and get instructor
    const session = await requireUserType('instructor');
    const instructorId = session.id;

    const sql = getDb();

    const assignments = await sql`
      SELECT
        ci.*,
        c.title as course_title,
        c.slug as course_slug,
        c.status as course_status
      FROM course_instructors ci
      INNER JOIN courses c ON ci.course_id = c.id
      WHERE ci.instructor_id = ${instructorId}
      ORDER BY ci.display_order ASC
    `;

    return {
      success: true,
      data: assignments as unknown as Array<CourseInstructor & { course_title: string }>,
    };
  } catch (error: any) {
    console.error('Error fetching instructor assignments:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch assignments',
    };
  }
}

/**
 * Get instructors assigned to a specific course
 */
export async function getCourseInstructorsAction(courseId: string): Promise<{
  success: boolean;
  data?: Array<Instructor & { instructor_role: CourseInstructorRole; display_order: number }>;
  error?: string;
}> {
  try {
    const sql = getDb();

    const result = await sql`
      SELECT
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.country,
        u.type,
        u.is_active,
        u.email_verified,
        u.created_at,
        u.updated_at,
        u.last_login_at,
        ip.user_id as profile_user_id,
        ip.title,
        ip.description,
        ip.picture_url,
        ip.linkedin_url,
        ip.x_url,
        ip.youtube_url,
        ip.website_url,
        ip.role,
        ip.preferred_language,
        ip.created_at as profile_created_at,
        ip.updated_at as profile_updated_at,
        ci.instructor_role,
        ci.display_order
      FROM course_instructors ci
      INNER JOIN users u ON ci.instructor_id = u.id AND u.type = 'instructor'
      LEFT JOIN instructor_profiles ip ON ip.user_id = u.id
      WHERE ci.course_id = ${courseId}
      ORDER BY ci.display_order ASC
    `;

    // Transform to Instructor objects with profiles
    const instructors = result.map(row => {
      const instructor: any = {
        id: row.id,
        email: row.email,
        first_name: row.first_name,
        last_name: row.last_name,
        country: row.country,
        type: row.type,
        is_active: row.is_active,
        email_verified: row.email_verified,
        created_at: row.created_at,
        updated_at: row.updated_at,
        last_login_at: row.last_login_at,
        instructor_role: row.instructor_role,
        display_order: row.display_order,
      };

      // Add profile if exists
      if (row.profile_user_id) {
        instructor.profile = {
          user_id: row.profile_user_id,
          title: row.title,
          description: row.description,
          picture_url: row.picture_url,
          linkedin_url: row.linkedin_url,
          x_url: row.x_url,
          youtube_url: row.youtube_url,
          website_url: row.website_url,
          role: row.role,
          preferred_language: row.preferred_language,
          created_at: row.profile_created_at,
          updated_at: row.profile_updated_at,
        };
      }

      return instructor;
    });

    return {
      success: true,
      data: instructors as Array<Instructor & { instructor_role: CourseInstructorRole; display_order: number }>,
    };
  } catch (error: any) {
    console.error('Error fetching course instructors:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch course instructors',
    };
  }
}
