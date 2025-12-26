'use server';

import { getDb } from '@/lib/db';
import { Course, Instructor } from '@/types/database';
import { canViewAllCourses, canCreateCourses } from '@/lib/roles';

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

/**
 * Create a new course (admin only)
 */
export async function createCourseAction(
  instructorId: string,
  courseData: {
    title: string;
    slug: string;
    short_description?: string;
    course_data?: any;
    cover_image?: string;
    meta_title?: string;
    meta_description?: string;
    language: 'en' | 'es';
    status: 'draft' | 'published';
    published_at?: string;
  },
  instructors: Array<{
    instructor_id: string;
    display_order: number;
    instructor_role: string;
  }>
): Promise<{
  success: boolean;
  data?: Course;
  error?: string;
}> {
  try {
    const sql = getDb();

    // Verify admin permission
    const adminQuery = await sql`
      SELECT * FROM instructors WHERE id = ${instructorId}
    `;

    if (adminQuery.length === 0) {
      return { success: false, error: 'Not authorized' };
    }

    const admin = adminQuery[0] as Instructor;

    if (!canCreateCourses(admin)) {
      return { success: false, error: 'Admin access required to create courses' };
    }

    // Check if slug already exists
    const existingCourse = await sql`
      SELECT id FROM courses WHERE slug = ${courseData.slug}
    `;

    if (existingCourse.length > 0) {
      return { success: false, error: 'A course with this slug already exists' };
    }

    // Create course
    const newCourses = await sql`
      INSERT INTO courses (
        slug,
        title,
        short_description,
        course_data,
        cover_image,
        meta_title,
        meta_description,
        language,
        status,
        published_at,
        enrollment_count,
        view_count
      ) VALUES (
        ${courseData.slug},
        ${courseData.title},
        ${courseData.short_description || null},
        ${courseData.course_data ? JSON.stringify(courseData.course_data) : null},
        ${courseData.cover_image || null},
        ${courseData.meta_title || null},
        ${courseData.meta_description || null},
        ${courseData.language},
        ${courseData.status},
        ${courseData.published_at || null},
        0,
        0
      )
      RETURNING *
    `;

    const newCourse = newCourses[0] as Course;

    // Assign instructors
    if (instructors && instructors.length > 0) {
      for (const inst of instructors) {
        await sql`
          INSERT INTO course_instructors (
            course_id,
            instructor_id,
            display_order,
            instructor_role
          ) VALUES (
            ${newCourse.id},
            ${inst.instructor_id},
            ${inst.display_order},
            ${inst.instructor_role}
          )
        `;
      }
    }

    return {
      success: true,
      data: newCourse,
    };
  } catch (error: any) {
    console.error('Error creating course:', error);
    return {
      success: false,
      error: error.message || 'Failed to create course',
    };
  }
}
