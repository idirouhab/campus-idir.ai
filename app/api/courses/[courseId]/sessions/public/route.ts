import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;
    console.log('[Fetch Public Sessions] Request for course:', courseId);

    const sql = getDb();

    // Get user session (for students)
    const session = await getSession();
    console.log('[Fetch Public Sessions] Session:', session ? `User ${session.id}` : 'No session');

    if (!session) {
      console.error('[Fetch Public Sessions] No authentication');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if student has access to this course (is enrolled)
    console.log('[Fetch Public Sessions] Checking enrollment for student:', session.id);
    const [enrollment] = await sql`
      SELECT 1 FROM course_signups
      WHERE student_id = ${session.id} AND course_id = ${courseId}
    `;
    console.log('[Fetch Public Sessions] Enrollment found:', !!enrollment);

    if (!enrollment) {
      console.error('[Fetch Public Sessions] User not enrolled in course');
      return NextResponse.json(
        { error: 'You must be enrolled in this course to view sessions' },
        { status: 403 }
      );
    }

    // Fetch sessions for this course
    console.log('[Fetch Public Sessions] Fetching sessions from database');
    const sessions = await sql`
      SELECT
        id,
        course_id,
        title,
        description,
        session_date,
        duration_minutes,
        display_order,
        timezone,
        meeting_url,
        recording_link,
        created_at,
        updated_at
      FROM course_sessions
      WHERE course_id = ${courseId}
      ORDER BY display_order ASC, session_date ASC
    `;
    console.log('[Fetch Public Sessions] Found', sessions.length, 'sessions');

    return NextResponse.json({
      success: true,
      sessions,
    });
  } catch (error: any) {
    console.error('[Fetch Public Sessions] Error:', {
      message: error?.message,
      stack: error?.stack,
      error
    });
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}
