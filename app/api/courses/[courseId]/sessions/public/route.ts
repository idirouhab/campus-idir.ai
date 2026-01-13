import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;
    const sql = getDb();

    // Get user session (for students)
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if student has access to this course (is enrolled)
    const [enrollment] = await sql`
      SELECT 1 FROM course_signups
      WHERE student_id = ${session.id} AND course_id = ${courseId}
    `;

    if (!enrollment) {
      return NextResponse.json(
        { error: 'You must be enrolled in this course to view sessions' },
        { status: 403 }
      );
    }

    // Fetch sessions for this course
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

    return NextResponse.json({
      success: true,
      sessions,
    });
  } catch (error) {
    console.error('[Fetch Public Course Sessions] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}
