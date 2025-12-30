import { NextRequest, NextResponse } from 'next/server';
import { requireUserType } from '@/lib/session';
import { getDb } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const session = await requireUserType('instructor');
    const { courseId } = await params;
    const sql = getDb();

    // Verify access to course
    if (session.role !== 'admin') {
      const courseAccess = await sql`
        SELECT 1 FROM course_instructors
        WHERE course_id = ${courseId} AND instructor_id = ${session.id}
      `;

      if (courseAccess.length === 0) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }
    }

    // Fetch materials
    const materials = await sql`
      SELECT * FROM course_materials
      WHERE course_id = ${courseId}
      ORDER BY display_order ASC, created_at DESC
    `;

    return NextResponse.json({
      success: true,
      materials,
    });
  } catch (error) {
    console.error('[Fetch Course Materials] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch materials' },
      { status: 500 }
    );
  }
}
