import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/session';
import { getDb } from '@/lib/db';

// GET /api/courses/[courseId]/check-instructor-access
// Check if current user is assigned as instructor to this course
// Does NOT require userType='instructor', works for dual-role users
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const session = await requireSession();
    const { courseId } = await params;
    const sql = getDb();

    // Check if user is assigned as instructor to this course
    const assignment = await sql`
      SELECT 1 FROM course_instructors
      WHERE course_id = ${courseId} AND instructor_id = ${session.id}
      LIMIT 1
    `;

    return NextResponse.json({
      success: true,
      hasAccess: assignment.length > 0,
    });
  } catch (error: any) {
    console.error('[Check Instructor Access] Error:', error);

    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to check instructor access' },
      { status: 500 }
    );
  }
}
