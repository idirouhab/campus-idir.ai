'use server';

import { getDb } from '@/lib/db';
import { Course, Instructor } from '@/types/database';
import { canViewAllCourses, canCreateCourses } from '@/lib/roles';
import { requireUserType, requireAdmin } from '@/lib/session';

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
export async function getInstructorCoursesAction(): Promise<{
  success: boolean;
  data?: CourseWithInstructors[];
  error?: string;
}> {
  try {
    // Verify session and get instructor
    const session = await requireUserType('instructor');
    const instructorId = session.id;

    const sql = getDb();

    // Get the instructor to check their role
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
          COALESCE(enrollment_data.enrollment_count, 0) as enrollment_count,
          COALESCE(instructor_data.instructors, '[]'::json) as instructors
        FROM courses c
        LEFT JOIN (
          SELECT course_id, COUNT(DISTINCT id) as enrollment_count
          FROM course_signups
          GROUP BY course_id
        ) enrollment_data ON c.id = enrollment_data.course_id
        LEFT JOIN (
          SELECT
            ci.course_id,
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
            ) as instructors
          FROM course_instructors ci
          JOIN instructors i ON ci.instructor_id = i.id
          GROUP BY ci.course_id
        ) instructor_data ON c.id = instructor_data.course_id
        ORDER BY c.created_at DESC
      `;
    } else {
      // Regular instructor: Get only their assigned courses
      courses = await sql`
        SELECT
          c.*,
          COALESCE(enrollment_data.enrollment_count, 0) as enrollment_count,
          COALESCE(instructor_data.instructors, '[]'::json) as instructors
        FROM courses c
        INNER JOIN course_instructors my_ci ON c.id = my_ci.course_id AND my_ci.instructor_id = ${instructorId}
        LEFT JOIN (
          SELECT course_id, COUNT(DISTINCT id) as enrollment_count
          FROM course_signups
          GROUP BY course_id
        ) enrollment_data ON c.id = enrollment_data.course_id
        LEFT JOIN (
          SELECT
            ci.course_id,
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
            ) as instructors
          FROM course_instructors ci
          JOIN instructors i ON ci.instructor_id = i.id
          GROUP BY ci.course_id
        ) instructor_data ON c.id = instructor_data.course_id
        ORDER BY c.created_at DESC
      `;
    }

    // Parse course_data for all courses if it's a string
    courses.forEach((course: any) => {
      if (course.course_data && typeof course.course_data === 'string') {
        try {
          course.course_data = JSON.parse(course.course_data);
        } catch (e) {
          console.error('Error parsing course_data for course', course.id, ':', e);
          course.course_data = null;
        }
      }
    });

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
  courseId: string
): Promise<{
  success: boolean;
  data?: CourseWithInstructors;
  error?: string;
}> {
  try {
    // Verify session and get instructor
    const session = await requireUserType('instructor');
    const instructorId = session.id;

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

    // Parse course_data if it's a string
    if (course.course_data && typeof course.course_data === 'string') {
      try {
        course.course_data = JSON.parse(course.course_data);
      } catch (e) {
        console.error('Error parsing course_data:', e);
        course.course_data = null;
      }
    }

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
export async function getAllInstructorsAction(): Promise<{
  success: boolean;
  data?: Instructor[];
  error?: string;
}> {
  try {
    // Verify admin permission via session
    const session = await requireAdmin();

    const sql = getDb();

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
      data: instructors as unknown as Instructor[],
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
    // Verify admin permission via session
    const session = await requireAdmin();

    const sql = getDb();

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
        ${courseData.course_data ? sql.json(courseData.course_data) : null},
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

/**
 * Update an existing course (admin only)
 */
export async function updateCourseAction(
  courseId: string,
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
    // Verify admin permission via session
    const session = await requireAdmin();

    const sql = getDb();

    // Get current course (for published_at check)
    const existingCourseQuery = await sql`
      SELECT * FROM courses WHERE id = ${courseId}
    `;

    if (existingCourseQuery.length === 0) {
      return { success: false, error: 'Course not found' };
    }

    const existingCourse = existingCourseQuery[0] as Course;

    // Check if slug already exists (excluding current course)
    const slugConflict = await sql`
      SELECT id FROM courses
      WHERE slug = ${courseData.slug} AND id != ${courseId}
    `;

    if (slugConflict.length > 0) {
      return { success: false, error: 'A course with this slug already exists' };
    }

    // Handle published_at logic
    let publishedAt = existingCourse.published_at || null;

    // Only set published_at if transitioning from draft to published for the first time
    if (existingCourse.status === 'draft' && courseData.status === 'published' && !publishedAt) {
      publishedAt = new Date().toISOString();
    }

    // Update course
    const updatedCourses = await sql`
      UPDATE courses
      SET
        slug = ${courseData.slug},
        title = ${courseData.title},
        short_description = ${courseData.short_description || null},
        course_data = ${courseData.course_data ? sql.json(courseData.course_data) : null},
        cover_image = ${courseData.cover_image || null},
        meta_title = ${courseData.meta_title || null},
        meta_description = ${courseData.meta_description || null},
        language = ${courseData.language},
        status = ${courseData.status},
        published_at = ${publishedAt || null},
        updated_at = NOW()
      WHERE id = ${courseId}
      RETURNING *
    `;

    const updatedCourse = updatedCourses[0] as Course;

    // Delete existing instructor assignments
    await sql`DELETE FROM course_instructors WHERE course_id = ${courseId}`;

    // Insert new instructor assignments
    if (instructors && instructors.length > 0) {
      for (const inst of instructors) {
        await sql`
          INSERT INTO course_instructors (
            course_id,
            instructor_id,
            display_order,
            instructor_role
          ) VALUES (
            ${courseId},
            ${inst.instructor_id},
            ${inst.display_order},
            ${inst.instructor_role}
          )
        `;
      }
    }

    return {
      success: true,
      data: updatedCourse,
    };
  } catch (error: any) {
    console.error('Error updating course:', error);
    return {
      success: false,
      error: error.message || 'Failed to update course',
    };
  }
}

/**
 * Get students enrolled in a course
 */
export async function getCourseStudentsAction(
  courseId: string
): Promise<{
  success: boolean;
  data?: Array<{
    id: string;
    student_id: string;
    first_name: string;
    last_name: string;
    email: string;
    signup_status: string;
    language: string;
    created_at: string;
    completed_at?: string;
  }>;
  error?: string;
}> {
  try {
    // Verify session and get instructor
    const session = await requireUserType('instructor');
    const instructorId = session.id;

    const sql = getDb();

    // Get instructor to check their role
    const instructors = await sql`
      SELECT * FROM instructors WHERE id = ${instructorId}
    `;

    if (instructors.length === 0) {
      return { success: false, error: 'Not authorized' };
    }

    const instructor = instructors[0] as Instructor;

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

    // Get students enrolled in the course
    const students = await sql`
      SELECT
        cs.id,
        cs.student_id,
        cs.signup_status,
        cs.language,
        cs.created_at,
        cs.completed_at,
        s.first_name,
        s.last_name,
        s.email
      FROM course_signups cs
      INNER JOIN students s ON cs.student_id = s.id
      WHERE cs.course_id = ${courseId}
      ORDER BY cs.created_at DESC
    `;

    return {
      success: true,
      data: students as unknown as Array<{
        id: string;
        student_id: string;
        first_name: string;
        last_name: string;
        email: string;
        signup_status: string;
        language: string;
        created_at: string;
        completed_at?: string;
      }>,
    };
  } catch (error: any) {
    console.error('Error fetching course students:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch students',
    };
  }
}

/**
 * Delete a course (admin only)
 */
export async function deleteCourseAction(
  courseId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Verify admin permission via session
    await requireAdmin();

    const sql = getDb();

    // Delete course (this will cascade to related tables if FK constraints are set properly)
    // First delete course_instructors, then course_signups, then the course
    await sql`DELETE FROM course_instructors WHERE course_id = ${courseId}`;
    await sql`DELETE FROM course_signups WHERE course_id = ${courseId}`;
    await sql`DELETE FROM courses WHERE id = ${courseId}`;

    return {
      success: true,
    };
  } catch (error: any) {
    console.error('Error deleting course:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete course',
    };
  }
}
