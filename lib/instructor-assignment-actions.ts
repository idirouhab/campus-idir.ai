'use server';

import { getDb } from '@/lib/db';
import { Instructor, CourseInstructor, CourseInstructorRole } from '@/types/database';
import { canAssignInstructors } from '@/lib/roles';

/**
 * Assign an instructor to a course
 */
export async function assignInstructorToCourseAction(
  adminId: string,
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
    const sql = getDb();

    // Verify admin permission
    const admins = await sql`
      SELECT * FROM instructors WHERE id = ${adminId}
    `;

    if (admins.length === 0) {
      return { success: false, error: 'Not authorized' };
    }

    const admin = admins[0] as Instructor;

    if (!canAssignInstructors(admin)) {
      return { success: false, error: 'Admin access required to assign instructors' };
    }

    // Check if course exists
    const courses = await sql`
      SELECT id FROM courses WHERE id = ${courseId}
    `;

    if (courses.length === 0) {
      return { success: false, error: 'Course not found' };
    }

    // Check if instructor exists and is active
    const instructors = await sql`
      SELECT id, is_active FROM instructors WHERE id = ${instructorId}
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
  adminId: string,
  courseId: string,
  instructorId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const sql = getDb();

    // Verify admin permission
    const admins = await sql`
      SELECT * FROM instructors WHERE id = ${adminId}
    `;

    if (admins.length === 0) {
      return { success: false, error: 'Not authorized' };
    }

    const admin = admins[0] as Instructor;

    if (!canAssignInstructors(admin)) {
      return { success: false, error: 'Admin access required to remove instructors' };
    }

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
  adminId: string,
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
    const sql = getDb();

    // Verify admin permission
    const admins = await sql`
      SELECT * FROM instructors WHERE id = ${adminId}
    `;

    if (admins.length === 0) {
      return { success: false, error: 'Not authorized' };
    }

    const admin = admins[0] as Instructor;

    if (!canAssignInstructors(admin)) {
      return { success: false, error: 'Admin access required to update instructor roles' };
    }

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
export async function getInstructorAssignmentsAction(instructorId: string): Promise<{
  success: boolean;
  data?: Array<CourseInstructor & { course_title: string }>;
  error?: string;
}> {
  try {
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

    const instructors = await sql`
      SELECT
        i.*,
        ci.instructor_role,
        ci.display_order
      FROM course_instructors ci
      INNER JOIN instructors i ON ci.instructor_id = i.id
      WHERE ci.course_id = ${courseId}
      ORDER BY ci.display_order ASC
    `;

    return {
      success: true,
      data: instructors as unknown as Array<Instructor & { instructor_role: CourseInstructorRole; display_order: number }>,
    };
  } catch (error: any) {
    console.error('Error fetching course instructors:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch course instructors',
    };
  }
}
