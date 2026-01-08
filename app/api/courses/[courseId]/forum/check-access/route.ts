import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/session';
import { checkCourseForumAccess } from '@/lib/forum-access';

// GET /api/courses/[courseId]/forum/check-access - Check forum access
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const session = await requireSession();
    const { courseId } = await params;
    console.log(session, courseId);
    const access = await checkCourseForumAccess(session.id, courseId);

    return NextResponse.json({
      success: true,
      ...access,
    });
  } catch (error: any) {
    console.error('[Check Forum Access] Error:', error);

    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to check forum access' },
      { status: 500 }
    );
  }
}
