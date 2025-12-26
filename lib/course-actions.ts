'use server';

import { getDb } from '@/lib/db';
import { Course, Instructor } from '@/types/database';
import { canViewAllCourses } from '@/lib/roles';

interface CourseWithInstructors extends Course {
  instructors?: Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    picture_url?: string;
    instructor_role: string;
    display_order: number;
  }>;
}

/**
 * Get courses for an instructor based on their role
 * - Admin: Gets all courses
 * - Regular instructor: Gets only their assigned courses
 */
export async function getInstructorCoursesAction(instructorId: string): Promise<{
  success: boolean;
  data?: CourseWithInstructors[];
  error?: string;
}> {
  try {
    const sql = getDb();

    // First, get the instructor to check their role
    const instructors = await sql`
      SELECT * FROM instructors WHERE id = ${instructorId}
    `;

    if (instructors.length === 0) {
      return { success: false, error: 'Instructor not found' };
    }

    const instructor = instructors[0] as Instructor;

    let courses: CourseWithInstructors[];

    if (canViewAllCourses(instructor)) {
      // Admin: Get all courses with their assigned instructors
      courses = await sql`
        SELECT
          c.*,
          COALESCE(
            json_agg(
              json_build_object(
                'id', i.id,
                'first_name', i.first_name,
                'last_name', i.last_name,
                'email', i.email,
                'picture_url', i.picture_url,
                'instructor_role', ci.instructor_role,
                'display_order', ci.display_order
              )
              ORDER BY ci.display_order
            ) FILTER (WHERE i.id IS NOT NULL),
            '[]'
          ) as instructors
        FROM courses c
        LEFT JOIN course_instructors ci ON c.id = ci.course_id
        LEFT JOIN instructors i ON ci.instructor_id = i.id
        GROUP BY c.id
        ORDER BY c.created_at DESC
      `;
    } else {
      // Regular instructor: Get only their assigned courses
      courses = await sql`
        SELECT
          c.*,
          COALESCE(
            json_agg(
              json_build_object(
                'id', i.id,
                'first_name', i.first_name,
                'last_name', i.last_name,
                'email', i.email,
                'picture_url', i.picture_url,
                'instructor_role', ci.instructor_role,
                'display_order', ci.display_order
              )
              ORDER BY ci.display_order
            ) FILTER (WHERE i.id IS NOT NULL),
            '[]'
          ) as instructors
        FROM courses c
        INNER JOIN course_instructors ci ON c.id = ci.course_id
        LEFT JOIN instructors i ON ci.instructor_id = i.id
        WHERE ci.instructor_id = ${instructorId}
        GROUP BY c.id
        ORDER BY c.created_at DESC
      `;
    }

    return {
      success: true,
      data: courses as CourseWithInstructors[],
    };
  } catch (error: any) {
    console.error('Error fetching courses:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch courses',
    };
  }
}

/**
 * Get a single course by ID with instructor check
 */
export async function getCourseByIdAction(
  courseId: string,
  instructorId: string
): Promise<{
  success: boolean;
  data?: CourseWithInstructors;
  error?: string;
}> {
  try {
    const sql = getDb();

    // Get instructor to check role
    const instructors = await sql`
      SELECT * FROM instructors WHERE id = ${instructorId}
    `;

    if (instructors.length === 0) {
      return { success: false, error: 'Instructor not found' };
    }

    const instructor = instructors[0] as Instructor;

    // Get course with instructors
    const courses = await sql`
      SELECT
        c.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', i.id,
              'first_name', i.first_name,
              'last_name', i.last_name,
              'email', i.email,
              'picture_url', i.picture_url,
              'instructor_role', ci.instructor_role,
              'display_order', ci.display_order
            )
            ORDER BY ci.display_order
          ) FILTER (WHERE i.id IS NOT NULL),
          '[]'
        ) as instructors
      FROM courses c
      LEFT JOIN course_instructors ci ON c.id = ci.course_id
      LEFT JOIN instructors i ON ci.instructor_id = i.id
      WHERE c.id = ${courseId}
      GROUP BY c.id
    `;

    if (courses.length === 0) {
      return { success: false, error: 'Course not found' };
    }

    const course = courses[0] as CourseWithInstructors;

    // Check access: admin can see all, regular instructor needs to be assigned
    if (!canViewAllCourses(instructor)) {
      const isAssigned = await sql`
        SELECT 1 FROM course_instructors
        WHERE course_id = ${courseId} AND instructor_id = ${instructorId}
      `;

      if (isAssigned.length === 0) {
        return { success: false, error: 'Access denied to this course' };
      }
    }

    return {
      success: true,
      data: course,
    };
  } catch (error: any) {
    console.error('Error fetching course:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch course',
    };
  }
}

/**
 * Get all instructors (for admin to assign)
 */
export async function getAllInstructorsAction(adminId: string): Promise<{
  success: boolean;
  data?: Instructor[];
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

    if (!canViewAllCourses(admin)) {
      return { success: false, error: 'Admin access required' };
    }

    // Get all instructors
    const instructors = await sql`
      SELECT
        id,
        email,
        first_name,
        last_name,
        picture_url,
        role,
        is_active
      FROM instructors
      WHERE is_active = true
      ORDER BY first_name, last_name
    `;

    return {
      success: true,
      data: instructors as Instructor[],
    };
  } catch (error: any) {
    console.error('Error fetching instructors:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch instructors',
    };
  }
}
