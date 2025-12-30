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
        { error: 'You must be enrolled in this course to access materials' },
        { status: 403 }
      );
    }

    // Fetch materials for this course
    const materials = await sql`
      SELECT
        id,
        course_id,
        original_filename,
        display_filename,
        file_url,
        file_type,
        file_size_bytes,
        mime_type,
        created_at
      FROM course_materials
      WHERE course_id = ${courseId}
      ORDER BY display_order ASC, created_at DESC
    `;

    return NextResponse.json({
      success: true,
      materials,
    });
  } catch (error) {
    console.error('[Fetch Public Course Materials] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch materials' },
      { status: 500 }
    );
  }
}
