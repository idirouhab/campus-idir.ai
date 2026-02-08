'use server';

import { getDb } from '@/lib/db';
import { Course, Instructor } from '@/types/database';
import { canViewAllCourses, canCreateCourses } from '@/lib/roles';
import { requireUserType, requireAdmin } from '@/lib/session';
import { getInstructorTimezone, localToUTC } from '@/lib/timezone-utils';

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

async function getInstructorById(instructorId: string): Promise<Instructor | null> {
  const sql = getDb();
  const rows = await sql`
    SELECT
      u.id, u.email, u.first_name, u.last_name, u.country, u.birthday, u.timezone,
      u.is_active, u.email_verified, u.created_at, u.updated_at, u.last_login_at,
      u.title, u.description, u.picture_url,
      u.linkedin_url, u.x_url, u.youtube_url, u.website_url,
      u.role, u.preferred_language
    FROM users u
    INNER JOIN user_roles ur ON ur.user_id = u.id AND ur.role = 'instructor'
    WHERE u.id = ${instructorId}
  `;

  if (rows.length === 0) return null;

  const row = rows[0];
  const instructor: Instructor = {
    id: row.id,
    email: row.email,
    first_name: row.first_name,
    last_name: row.last_name,
    country: row.country || undefined,
    birthday: row.birthday || undefined,
    timezone: row.timezone || undefined,
    is_active: row.is_active,
    email_verified: row.email_verified,
    created_at: row.created_at,
    updated_at: row.updated_at,
    last_login_at: row.last_login_at || undefined,
    profile: {
      user_id: row.id,
      title: row.title || undefined,
      description: row.description || undefined,
      picture_url: row.picture_url || undefined,
      linkedin_url: row.linkedin_url || undefined,
      x_url: row.x_url || undefined,
      youtube_url: row.youtube_url || undefined,
      website_url: row.website_url || undefined,
      role: row.role || 'instructor',
      preferred_language: row.preferred_language || 'en',
      created_at: row.created_at,
      updated_at: row.updated_at,
    },
  };

  return instructor;
}

function parseEuropeanDateToISO(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Accept ISO (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // Accept DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const parts = trimmed.split(/[\/\-.]/);
  if (parts.length !== 3) return null;
  const [day, month, year] = parts.map((p) => p.trim());
  if (!day || !month || !year) return null;
  if (year.length !== 4) return null;
  const dd = day.padStart(2, '0');
  const mm = month.padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

function durationMinutesFromTimes(startTime: string, endTime?: string, fallbackMinutes?: number): number | null {
  const normalize = (value: string) => {
    const v = value.trim();
    if (/^\d{1,2}$/.test(v)) return `${v.padStart(2, '0')}:00`;
    return v;
  };
  const toMinutes = (value: string) => {
    const normalized = normalize(value);
    const [h, m] = normalized.split(':').map((v) => Number(v));
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  };
  const start = toMinutes(startTime);
  if (start === null) return null;
  if (!endTime) return fallbackMinutes ?? null;
  const end = toMinutes(endTime);
  if (end === null) return fallbackMinutes ?? null;
  const diff = end - start;
  if (diff <= 0) return fallbackMinutes ?? null;
  return diff;
}

async function syncCourseSessionsFromLogistics(
  courseId: string,
  courseData: any,
  instructorId: string,
  overwrite: boolean = false
): Promise<number> {
  const sessions = courseData?.logistics?.sessions;
  if (!Array.isArray(sessions) || sessions.length === 0) return 0;

  const instructor = await getInstructorById(instructorId);
  const timezone = instructor ? getInstructorTimezone(instructor) : 'Europe/Berlin';
  const fallbackMinutes = Math.round((courseData?.logistics?.session_duration_hours || 0) * 60);

  const normalized = sessions
    .map((session: any, i: number) => {
      if (!session?.date || !session?.start_time) return null;
      const isoDate = parseEuropeanDateToISO(session.date);
      if (!isoDate) return null;
      const durationMinutes = durationMinutesFromTimes(
        session.start_time,
        session.end_time,
        fallbackMinutes
      );
      if (!durationMinutes || durationMinutes <= 0) return null;
      return {
        displayOrder: i,
        sessionDate: localToUTC(isoDate, session.start_time, timezone),
        durationMinutes,
      };
    })
    .filter(Boolean) as Array<{ displayOrder: number; sessionDate: string; durationMinutes: number }>;

  if (normalized.length === 0) return 0;

  const sql = getDb();
  if (!overwrite) {
    const existing = await sql`SELECT id FROM course_sessions WHERE course_id = ${courseId} LIMIT 1`;
    if (existing.length > 0) return 0;
  } else {
    await sql`DELETE FROM course_sessions WHERE course_id = ${courseId}`;
  }

  for (let i = 0; i < normalized.length; i += 1) {
    const session = normalized[i];
    await sql`
      INSERT INTO course_sessions (
        course_id,
        title,
        description,
        session_date,
        duration_minutes,
        display_order,
        timezone,
        meeting_url,
        recording_link
      ) VALUES (
        ${courseId},
        ${`Session ${i + 1}`},
        ${null},
        ${session.sessionDate},
        ${session.durationMinutes},
        ${session.displayOrder},
        ${timezone},
        ${null},
        ${null}
      )
    `;
  }

  return normalized.length;
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
    const instructor = await getInstructorById(instructorId);
    if (!instructor) {
      return { success: false, error: 'Instructor not found' };
    }

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
                'id', u.id,
                'first_name', u.first_name,
                'last_name', u.last_name,
                'email', u.email,
                'picture_url', u.picture_url,
                'instructor_role', ci.instructor_role,
                'display_order', ci.display_order
              )
              ORDER BY ci.display_order
            ) as instructors
          FROM course_instructors ci
          JOIN users u ON ci.instructor_id = u.id
          INNER JOIN user_roles ur_check ON ur_check.user_id = u.id AND ur_check.role = 'instructor'
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
                'id', u.id,
                'first_name', u.first_name,
                'last_name', u.last_name,
                'email', u.email,
                'picture_url', u.picture_url,
                'instructor_role', ci.instructor_role,
                'display_order', ci.display_order
              )
              ORDER BY ci.display_order
            ) as instructors
          FROM course_instructors ci
          JOIN users u ON ci.instructor_id = u.id
          INNER JOIN user_roles ur_check ON ur_check.user_id = u.id AND ur_check.role = 'instructor'
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
    const instructor = await getInstructorById(instructorId);
    if (!instructor) {
      return { success: false, error: 'Instructor not found' };
    }

    // Get course with instructors
    const courses = await sql`
      SELECT
        c.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', u.id,
              'first_name', u.first_name,
              'last_name', u.last_name,
              'email', u.email,
              'picture_url', u.picture_url,
              'instructor_role', ci.instructor_role,
              'display_order', ci.display_order
            )
            ORDER BY ci.display_order
          ) FILTER (WHERE u.id IS NOT NULL),
          '[]'
        ) as instructors
      FROM courses c
      LEFT JOIN course_instructors ci ON c.id = ci.course_id
      LEFT JOIN users u ON ci.instructor_id = u.id
      LEFT JOIN user_roles ur ON ur.user_id = u.id AND ur.role = 'instructor'
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
        course.course_data = undefined;
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
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.picture_url,
        u.role as role,
        u.is_active
      FROM users u
      INNER JOIN user_roles ur ON ur.user_id = u.id AND ur.role = 'instructor'
      WHERE u.is_active = true
      ORDER BY u.first_name, u.last_name
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
 * Get all instructors with their course count and full profile information
 */
export async function getAllInstructorsWithStatsAction(): Promise<{
  success: boolean;
  data?: Array<{
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    country?: string;
    created_at: string;
    picture_url?: string;
    birthday?: string;
    course_count: number;
  }>;
  error?: string;
}> {
  try {
    // Verify admin permission via session
    const session = await requireAdmin();

    const sql = getDb();

    // Get all instructors with their course count
    const instructors = await sql`
      SELECT
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.country,
        u.created_at,
        u.birthday,
        u.picture_url,
        COALESCE(course_data.course_count, 0) as course_count
      FROM users u
      INNER JOIN user_roles ur ON ur.user_id = u.id AND ur.role = 'instructor'
      LEFT JOIN (
        SELECT instructor_id, COUNT(DISTINCT course_id) as course_count
        FROM course_instructors
        GROUP BY instructor_id
      ) course_data ON u.id = course_data.instructor_id
      WHERE u.is_active = true
      ORDER BY u.created_at DESC
    `;

    return {
      success: true,
      data: instructors as unknown as Array<{
        id: string;
        email: string;
        first_name: string;
        last_name: string;
        country?: string;
        created_at: string;
        picture_url?: string;
        birthday?: string;
        course_count: number;
      }>,
    };
  } catch (error: any) {
    console.error('Error fetching instructors with stats:', error);
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
    is_private?: boolean;
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
        is_private,
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
        ${courseData.is_private || false},
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

    await syncCourseSessionsFromLogistics(newCourse.id, courseData.course_data, session.id);

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
    is_private?: boolean;
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
        is_private = ${courseData.is_private !== undefined ? courseData.is_private : false},
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

    await syncCourseSessionsFromLogistics(courseId, courseData.course_data, session.id);

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

export async function forceResyncCourseSessionsAction(courseId: string): Promise<{
  success: boolean;
  count?: number;
  error?: string;
}> {
  try {
    const session = await requireUserType('instructor');
    const sql = getDb();

    const instructor = await getInstructorById(session.id);
    if (!instructor) {
      return { success: false, error: 'Instructor not found' };
    }

    if (!canViewAllCourses(instructor)) {
      const courseInstructors = await sql`
        SELECT * FROM course_instructors
        WHERE course_id = ${courseId} AND instructor_id = ${session.id}
      `;
      if (courseInstructors.length === 0) {
        return { success: false, error: 'Access denied' };
      }
    }

    const courses = await sql`
      SELECT course_data FROM courses WHERE id = ${courseId}
    `;
    if (courses.length === 0) {
      return { success: false, error: 'Course not found' };
    }

    let courseData = courses[0].course_data as any;
    if (courseData && typeof courseData === 'string') {
      try {
        courseData = JSON.parse(courseData);
      } catch {
        return { success: false, error: 'Invalid course_data JSON' };
      }
    }

    const sessions = courseData?.logistics?.sessions;
    if (!Array.isArray(sessions) || sessions.length === 0) {
      return { success: false, error: 'No logistics sessions to sync' };
    }

    const inserted = await syncCourseSessionsFromLogistics(courseId, courseData, session.id, true);
    if (inserted === 0) {
      return { success: false, error: 'No valid sessions to insert' };
    }

    return { success: true, count: inserted };
  } catch (error: any) {
    console.error('Error force resyncing sessions:', error);
    return { success: false, error: error.message || 'Failed to resync sessions' };
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
    const instructor = await getInstructorById(instructorId);
    if (!instructor) {
      return { success: false, error: 'Not authorized' };
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
      INNER JOIN users s ON cs.student_id = s.id
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

/**
 * Update student status in a course
 */
export async function updateStudentStatusAction(
  signupId: string,
  newStatus: 'pending' | 'confirmed' | 'enrolled' | 'cancelled' | 'expired'
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Verify instructor permission via session
    await requireUserType('instructor');

    const sql = getDb();

    // Update student status
    await sql`
      UPDATE course_signups
      SET signup_status = ${newStatus},
          updated_at = NOW()
      WHERE id = ${signupId}
    `;

    return {
      success: true,
    };
  } catch (error: any) {
    console.error('Error updating student status:', error);
    return {
      success: false,
      error: error.message || 'Failed to update student status',
    };
  }
}

/**
 * Delete a student from a course
 */
export async function deleteStudentFromCourseAction(
  signupId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Verify instructor permission via session
    await requireUserType('instructor');

    const sql = getDb();

    // Delete student signup
    await sql`DELETE FROM course_signups WHERE id = ${signupId}`;

    return {
      success: true,
    };
  } catch (error: any) {
    console.error('Error deleting student:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete student',
    };
  }
}
