'use server';

import { getDb } from '@/lib/db';
import { CourseSession, Instructor } from '@/types/database';
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
      ip.user_id as profile_user_id, ip.title, ip.description, ip.picture_url,
      ip.linkedin_url, ip.x_url, ip.youtube_url, ip.website_url,
      ip.role, ip.preferred_language,
      ip.created_at as profile_created_at, ip.updated_at as profile_updated_at
    FROM users u
    INNER JOIN instructor_profiles ip ON ip.user_id = u.id
    WHERE u.id = ${instructorId}
  `;

  if (rows.length === 0) return null;

  const row = rows[0];

  // Construct Instructor object with nested profile
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
      user_id: row.profile_user_id,
      title: row.title || undefined,
      description: row.description || undefined,
      picture_url: row.picture_url || undefined,
      linkedin_url: row.linkedin_url || undefined,
      x_url: row.x_url || undefined,
      youtube_url: row.youtube_url || undefined,
      website_url: row.website_url || undefined,
      role: row.role,
      preferred_language: row.preferred_language,
      created_at: row.profile_created_at,
      updated_at: row.profile_updated_at,
    },
  };

  return instructor;
}

/**
 * Get all sessions for a course (ordered by display_order)
 */
export async function getCourseSessionsAction(courseId: string): Promise<{
  success: boolean;
  data?: CourseSession[];
  error?: string;
}> {
  try {
    const session = await requireUserType('instructor');
    const sql = getDb();

    // Verify instructor has access to the course
    const instructor = await getInstructorById(session.id);

    if (!instructor) {
      return { success: false, error: 'Instructor not found' };
    }

    // Check if instructor has access to this course
    if (!canViewAllCourses(instructor)) {
      const courseInstructors = await sql`
        SELECT * FROM course_instructors
        WHERE course_id = ${courseId} AND instructor_id = ${session.id}
      `;

      if (courseInstructors.length === 0) {
        return { success: false, error: 'Access denied' };
      }
    }

    // Fetch sessions ordered by display_order
    const sessions = await sql`
      SELECT *
      FROM course_sessions
      WHERE course_id = ${courseId}
      ORDER BY display_order ASC, session_date ASC
    `;

    return {
      success: true,
      data: sessions as unknown as CourseSession[],
    };
  } catch (error: any) {
    console.error('Error fetching course sessions:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch course sessions',
    };
  }
}

/**
 * Create a new session
 */
export async function createSessionAction(sessionData: {
  courseId: string;
  title: string;
  description?: string;
  sessionDate: string; // ISO 8601 UTC
  durationMinutes: number;
  timezone: string;
  meetingUrl?: string;
  displayOrder: number;
}): Promise<{ success: boolean; data?: CourseSession; error?: string }> {
  try {
    const session = await requireUserType('instructor');
    const sql = getDb();

    // Verify instructor has access to the course
    const instructor = await getInstructorById(session.id);

    if (!instructor) {
      return { success: false, error: 'Instructor not found' };
    }

    // Check if instructor has access to this course
    if (!canViewAllCourses(instructor)) {
      const courseInstructors = await sql`
        SELECT * FROM course_instructors
        WHERE course_id = ${sessionData.courseId} AND instructor_id = ${session.id}
      `;

      if (courseInstructors.length === 0) {
        return { success: false, error: 'Access denied' };
      }
    }

    // Validate duration
    if (sessionData.durationMinutes <= 0) {
      return { success: false, error: 'Duration must be positive' };
    }

    // Create session
    const newSessions = await sql`
      INSERT INTO course_sessions (
        course_id,
        title,
        description,
        session_date,
        duration_minutes,
        display_order,
        timezone,
        meeting_url
      ) VALUES (
        ${sessionData.courseId},
        ${sessionData.title},
        ${sessionData.description || null},
        ${sessionData.sessionDate},
        ${sessionData.durationMinutes},
        ${sessionData.displayOrder},
        ${sessionData.timezone},
        ${sessionData.meetingUrl || null}
      )
      RETURNING *
    `;

    return {
      success: true,
      data: newSessions[0] as unknown as CourseSession,
    };
  } catch (error: any) {
    console.error('Error creating session:', error);
    return {
      success: false,
      error: error.message || 'Failed to create session',
    };
  }
}

/**
 * Update existing session
 */
export async function updateSessionAction(
  sessionId: string,
  sessionData: {
    title?: string;
    description?: string;
    sessionDate?: string;
    durationMinutes?: number;
    timezone?: string;
    meetingUrl?: string;
    displayOrder?: number;
  }
): Promise<{ success: boolean; data?: CourseSession; error?: string }> {
  try {
    const session = await requireUserType('instructor');
    const sql = getDb();

    // Get the session's course_id to verify access
    const existingSessions = await sql`
      SELECT course_id FROM course_sessions WHERE id = ${sessionId}
    `;

    if (existingSessions.length === 0) {
      return { success: false, error: 'Session not found' };
    }

    const courseId = existingSessions[0].course_id;

    // Verify instructor has access to the course
    const instructor = await getInstructorById(session.id);

    if (!instructor) {
      return { success: false, error: 'Instructor not found' };
    }

    // Check if instructor has access to this course
    if (!canViewAllCourses(instructor)) {
      const courseInstructors = await sql`
        SELECT * FROM course_instructors
        WHERE course_id = ${courseId} AND instructor_id = ${session.id}
      `;

      if (courseInstructors.length === 0) {
        return { success: false, error: 'Access denied' };
      }
    }

    // Validate duration if provided
    if (sessionData.durationMinutes !== undefined && sessionData.durationMinutes <= 0) {
      return { success: false, error: 'Duration must be positive' };
    }

    // Get current session to merge with new data
    const currentSessions = await sql`SELECT * FROM course_sessions WHERE id = ${sessionId}`;
    if (currentSessions.length === 0) {
      return { success: false, error: 'Session not found' };
    }
    const current = currentSessions[0];

    // Merge current values with updates
    const title = sessionData.title !== undefined ? sessionData.title : current.title;
    const description = sessionData.description !== undefined ? sessionData.description : current.description;
    const session_date = sessionData.sessionDate !== undefined ? sessionData.sessionDate : current.session_date;
    const duration_minutes = sessionData.durationMinutes !== undefined ? sessionData.durationMinutes : current.duration_minutes;
    const timezone = sessionData.timezone !== undefined ? sessionData.timezone : current.timezone;
    const meeting_url = sessionData.meetingUrl !== undefined ? sessionData.meetingUrl : current.meeting_url;
    const display_order = sessionData.displayOrder !== undefined ? sessionData.displayOrder : current.display_order;

    // Update session with all fields
    const updatedSessions = await sql`
      UPDATE course_sessions
      SET
        title = ${title},
        description = ${description},
        session_date = ${session_date},
        duration_minutes = ${duration_minutes},
        timezone = ${timezone},
        meeting_url = ${meeting_url},
        display_order = ${display_order},
        updated_at = NOW()
      WHERE id = ${sessionId}
      RETURNING *
    `;

    return {
      success: true,
      data: updatedSessions[0] as unknown as CourseSession,
    };
  } catch (error: any) {
    console.error('Error updating session:', error);
    return {
      success: false,
      error: error.message || 'Failed to update session',
    };
  }
}

/**
 * Delete session (CASCADE will delete associated materials)
 */
export async function deleteSessionAction(sessionId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await requireUserType('instructor');
    const sql = getDb();

    // Get the session's course_id to verify access
    const existingSessions = await sql`
      SELECT course_id FROM course_sessions WHERE id = ${sessionId}
    `;

    if (existingSessions.length === 0) {
      return { success: false, error: 'Session not found' };
    }

    const courseId = existingSessions[0].course_id;

    // Verify instructor has access to the course
    const instructor = await getInstructorById(session.id);

    if (!instructor) {
      return { success: false, error: 'Instructor not found' };
    }

    // Check if instructor has access to this course
    if (!canViewAllCourses(instructor)) {
      const courseInstructors = await sql`
        SELECT * FROM course_instructors
        WHERE course_id = ${courseId} AND instructor_id = ${session.id}
      `;

      if (courseInstructors.length === 0) {
        return { success: false, error: 'Access denied' };
      }
    }

    // Delete session (CASCADE will handle materials)
    await sql`DELETE FROM course_sessions WHERE id = ${sessionId}`;

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting session:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete session',
    };
  }
}

/**
 * Reorder sessions (update display_order for multiple sessions)
 */
export async function reorderSessionsAction(
  courseId: string,
  sessionOrders: Array<{ id: string; display_order: number }>
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireUserType('instructor');
    const sql = getDb();

    // Verify instructor has access to the course
    const instructor = await getInstructorById(session.id);

    if (!instructor) {
      return { success: false, error: 'Instructor not found' };
    }

    // Check if instructor has access to this course
    if (!canViewAllCourses(instructor)) {
      const courseInstructors = await sql`
        SELECT * FROM course_instructors
        WHERE course_id = ${courseId} AND instructor_id = ${session.id}
      `;

      if (courseInstructors.length === 0) {
        return { success: false, error: 'Access denied' };
      }
    }

    // Update display_order for each session
    for (const { id, display_order } of sessionOrders) {
      await sql`
        UPDATE course_sessions
        SET display_order = ${display_order}, updated_at = NOW()
        WHERE id = ${id} AND course_id = ${courseId}
      `;
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error reordering sessions:', error);
    return {
      success: false,
      error: error.message || 'Failed to reorder sessions',
    };
  }
}
