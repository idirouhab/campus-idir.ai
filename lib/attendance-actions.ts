'use server';

import { getDb } from '@/lib/db';
import { SessionAttendance, AttendanceRecord, SessionAttendanceSummary, Instructor } from '@/types/database';
import { requireUserType } from '@/lib/session';
import { canViewAllCourses } from '@/lib/roles';

/**
 * Helper function to fetch instructor with proper structure
 */
async function getInstructorById(instructorId: string): Promise<Instructor | null> {
  const sql = getDb();

  const rows = await sql`
    SELECT
      u.id, u.email, u.first_name, u.last_name, u.country, u.birthday, u.timezone,
      u.is_active, u.email_verified, u.created_at, u.updated_at, u.last_login_at,
      u.title, u.description, u.picture_url,
      u.linkedin_url, u.x_url, u.youtube_url,
      u.website_url, u.role, u.preferred_language
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

/**
 * Verify instructor has access to a course
 */
async function verifyInstructorCourseAccess(
  instructorId: string,
  courseId: string
): Promise<{ success: boolean; error?: string }> {
  const sql = getDb();
  const instructor = await getInstructorById(instructorId);

  if (!instructor) {
    return { success: false, error: 'Instructor not found' };
  }

  // Admin can access all courses
  if (!canViewAllCourses(instructor)) {
    const courseInstructors = await sql`
      SELECT 1 FROM course_instructors
      WHERE course_id = ${courseId} AND instructor_id = ${instructorId}
    `;

    if (courseInstructors.length === 0) {
      return { success: false, error: 'Access denied to this course' };
    }
  }

  return { success: true };
}

/**
 * Get attendance records for a specific session
 */
export async function getSessionAttendanceAction(
  sessionId: string
): Promise<{
  success: boolean;
  data?: AttendanceRecord[];
  error?: string;
}> {
  try {
    const session = await requireUserType('instructor');
    const sql = getDb();

    // Get course_id from session to verify access
    const sessions = await sql`
      SELECT course_id FROM course_sessions WHERE id = ${sessionId}
    `;

    if (sessions.length === 0) {
      return { success: false, error: 'Session not found' };
    }

    const courseId = sessions[0].course_id;

    // Verify access
    const accessCheck = await verifyInstructorCourseAccess(session.id, courseId);
    if (!accessCheck.success) {
      return { success: false, error: accessCheck.error };
    }

    // Get all enrolled students with their attendance status
    const attendanceRecords = await sql`
      SELECT
        COALESCE(sa.id::text, gen_random_uuid()::text) as id,
        cs.id as session_id,
        u.id as student_id,
        csig.id as signup_id,
        COALESCE(sa.attendance_status, 'absent') as attendance_status,
        sa.marked_by,
        sa.marked_at,
        sa.notes,
        u.first_name as student_first_name,
        u.last_name as student_last_name,
        u.email as student_email,
        csig.created_at
      FROM course_sessions cs
      INNER JOIN course_signups csig ON cs.course_id = csig.course_id
      INNER JOIN users u ON csig.student_id = u.id
      LEFT JOIN session_attendance sa ON sa.session_id = cs.id AND sa.student_id = u.id
      WHERE cs.id = ${sessionId}
        AND csig.signup_status IN ('enrolled', 'confirmed')
      ORDER BY u.last_name, u.first_name
    `;

    return {
      success: true,
      data: attendanceRecords as unknown as AttendanceRecord[],
    };
  } catch (error: any) {
    console.error('Error fetching session attendance:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch attendance',
    };
  }
}

/**
 * Mark or update attendance for a single student
 */
export async function markAttendanceAction(
  sessionId: string,
  studentId: string,
  attendanceStatus: 'present' | 'absent',
  notes?: string
): Promise<{
  success: boolean;
  data?: SessionAttendance;
  error?: string;
}> {
  try {
    const session = await requireUserType('instructor');
    const sql = getDb();

    // Get course_id from session to verify access
    const sessions = await sql`
      SELECT course_id FROM course_sessions WHERE id = ${sessionId}
    `;

    if (sessions.length === 0) {
      return { success: false, error: 'Session not found' };
    }

    const courseId = sessions[0].course_id;

    // Verify access
    const accessCheck = await verifyInstructorCourseAccess(session.id, courseId);
    if (!accessCheck.success) {
      return { success: false, error: accessCheck.error };
    }

    // Get signup_id
    const signups = await sql`
      SELECT id FROM course_signups
      WHERE course_id = ${courseId} AND student_id = ${studentId}
        AND signup_status IN ('enrolled', 'confirmed')
    `;

    if (signups.length === 0) {
      return { success: false, error: 'Student not enrolled in this course' };
    }

    const signupId = signups[0].id;

    // Upsert attendance record
    const result = await sql`
      INSERT INTO session_attendance (
        session_id,
        student_id,
        signup_id,
        attendance_status,
        marked_by,
        notes
      ) VALUES (
        ${sessionId},
        ${studentId},
        ${signupId},
        ${attendanceStatus},
        ${session.id},
        ${notes || null}
      )
      ON CONFLICT (session_id, student_id)
      DO UPDATE SET
        attendance_status = EXCLUDED.attendance_status,
        marked_by = EXCLUDED.marked_by,
        marked_at = NOW(),
        notes = EXCLUDED.notes,
        updated_at = NOW()
      RETURNING *
    `;

    return {
      success: true,
      data: result[0] as unknown as SessionAttendance,
    };
  } catch (error: any) {
    console.error('Error marking attendance:', error);
    return {
      success: false,
      error: error.message || 'Failed to mark attendance',
    };
  }
}

/**
 * Bulk mark all students as present or absent for a session
 */
export async function bulkMarkAttendanceAction(
  sessionId: string,
  attendanceStatus: 'present' | 'absent'
): Promise<{
  success: boolean;
  count?: number;
  error?: string;
}> {
  try {
    const session = await requireUserType('instructor');
    const sql = getDb();

    // Get course_id from session to verify access
    const sessions = await sql`
      SELECT course_id FROM course_sessions WHERE id = ${sessionId}
    `;

    if (sessions.length === 0) {
      return { success: false, error: 'Session not found' };
    }

    const courseId = sessions[0].course_id;

    // Verify access
    const accessCheck = await verifyInstructorCourseAccess(session.id, courseId);
    if (!accessCheck.success) {
      return { success: false, error: accessCheck.error };
    }

    // Get all enrolled students
    const enrolledStudents = await sql`
      SELECT csig.id as signup_id, csig.student_id
      FROM course_signups csig
      WHERE csig.course_id = ${courseId}
        AND csig.signup_status IN ('enrolled', 'confirmed')
    `;

    if (enrolledStudents.length === 0) {
      return { success: true, count: 0 };
    }

    // Bulk insert/update attendance
    let count = 0;
    for (const student of enrolledStudents) {
      await sql`
        INSERT INTO session_attendance (
          session_id,
          student_id,
          signup_id,
          attendance_status,
          marked_by
        ) VALUES (
          ${sessionId},
          ${student.student_id},
          ${student.signup_id},
          ${attendanceStatus},
          ${session.id}
        )
        ON CONFLICT (session_id, student_id)
        DO UPDATE SET
          attendance_status = EXCLUDED.attendance_status,
          marked_by = EXCLUDED.marked_by,
          marked_at = NOW(),
          updated_at = NOW()
      `;
      count++;
    }

    return {
      success: true,
      count,
    };
  } catch (error: any) {
    console.error('Error bulk marking attendance:', error);
    return {
      success: false,
      error: error.message || 'Failed to bulk mark attendance',
    };
  }
}

/**
 * Get attendance summary for all sessions in a course
 */
export async function getCourseAttendanceSummaryAction(
  courseId: string
): Promise<{
  success: boolean;
  data?: SessionAttendanceSummary[];
  error?: string;
}> {
  try {
    const session = await requireUserType('instructor');
    const sql = getDb();

    // Verify access
    const accessCheck = await verifyInstructorCourseAccess(session.id, courseId);
    if (!accessCheck.success) {
      return { success: false, error: accessCheck.error };
    }

    // Get total enrolled students count
    const enrolledCountResult = await sql`
      SELECT COUNT(DISTINCT id) as total
      FROM course_signups
      WHERE course_id = ${courseId}
        AND signup_status IN ('enrolled', 'confirmed')
    `;

    const totalEnrolled = Number(enrolledCountResult[0]?.total || 0);

    // Get attendance summary for each session
    const summaries = await sql`
      SELECT
        cs.id as session_id,
        cs.title as session_title,
        cs.session_date,
        ${totalEnrolled} as total_students,
        COALESCE(SUM(CASE WHEN sa.attendance_status = 'present' THEN 1 ELSE 0 END), 0) as present_count,
        COALESCE(SUM(CASE WHEN sa.attendance_status = 'absent' OR sa.attendance_status IS NULL THEN 1 ELSE 0 END), 0) as absent_count,
        CASE
          WHEN ${totalEnrolled} > 0 THEN
            ROUND((COALESCE(SUM(CASE WHEN sa.attendance_status = 'present' THEN 1 ELSE 0 END), 0)::numeric / ${totalEnrolled}) * 100, 1)
          ELSE 0
        END as attendance_percentage
      FROM course_sessions cs
      LEFT JOIN session_attendance sa ON cs.id = sa.session_id
      WHERE cs.course_id = ${courseId}
      GROUP BY cs.id, cs.title, cs.session_date, cs.display_order
      ORDER BY cs.display_order, cs.session_date
    `;

    return {
      success: true,
      data: summaries as unknown as SessionAttendanceSummary[],
    };
  } catch (error: any) {
    console.error('Error fetching attendance summary:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch attendance summary',
    };
  }
}

/**
 * Get attendance for a specific student across all course sessions
 */
export async function getStudentAttendanceAction(
  courseId: string,
  studentId: string
): Promise<{
  success: boolean;
  data?: Array<{
    session_id: string;
    session_title: string;
    session_date: string;
    attendance_status: 'present' | 'absent';
  }>;
  error?: string;
}> {
  try {
    const session = await requireUserType('instructor');
    const sql = getDb();

    // Verify access
    const accessCheck = await verifyInstructorCourseAccess(session.id, courseId);
    if (!accessCheck.success) {
      return { success: false, error: accessCheck.error };
    }

    const attendance = await sql`
      SELECT
        cs.id as session_id,
        cs.title as session_title,
        cs.session_date,
        COALESCE(sa.attendance_status, 'absent') as attendance_status
      FROM course_sessions cs
      LEFT JOIN session_attendance sa ON cs.id = sa.session_id AND sa.student_id = ${studentId}
      WHERE cs.course_id = ${courseId}
      ORDER BY cs.display_order, cs.session_date
    `;

    return {
      success: true,
      data: attendance as any,
    };
  } catch (error: any) {
    console.error('Error fetching student attendance:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch student attendance',
    };
  }
}
