import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/session';
import { verifyCSRF } from '@/lib/api-helpers';
import { getDb } from '@/lib/db';
import { requireCourseForumAccess } from '@/lib/forum-access';

// PATCH /api/courses/[courseId]/forum/posts/[postId]/answers/[answerId] - Update answer (author only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string; postId: string; answerId: string }> }
) {
  try {
    const session = await requireSession();
    const { courseId, postId, answerId } = await params;

    // Verify CSRF
    const isValidCSRF = await verifyCSRF(request);
    if (!isValidCSRF) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }

    // Verify access
    await requireCourseForumAccess(session, courseId);

    const body = await request.json();
    const { body: answerBody } = body;

    // Validate input
    if (!answerBody) {
      return NextResponse.json(
        { error: 'Answer body is required' },
        { status: 400 }
      );
    }

    if (answerBody.length < 10) {
      return NextResponse.json(
        { error: 'Answer must be at least 10 characters' },
        { status: 400 }
      );
    }

    const sql = getDb();

    // Update answer (only if user is the author)
    const result = await sql`
      UPDATE forum_answers
      SET body = ${answerBody}, updated_at = NOW()
      WHERE id = ${answerId}
        AND post_id = ${postId}
        AND course_id = ${courseId}
        AND user_id = ${session.id}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Answer not found or you do not have permission to update it' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      answer: result[0],
    });
  } catch (error: any) {
    console.error('[Forum Answer PATCH] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update forum answer' },
      { status: 500 }
    );
  }
}

// DELETE /api/courses/[courseId]/forum/posts/[postId]/answers/[answerId] - Delete answer (author only)
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ courseId: string; postId: string; answerId: string }> }
) {
    try {
        const session = await requireSession();
        const { courseId, postId, answerId } = await params;

        // Verify CSRF
        const isValidCSRF = await verifyCSRF(request);
        if (!isValidCSRF) {
            return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
        }

        // Verify access
        await requireCourseForumAccess(session, courseId);

        const sql = getDb();
        console.log(`
      DELETE forum_answers
      WHERE id = ${answerId}
        AND post_id = ${postId}
        AND course_id = ${courseId}
        AND user_id = ${session.id}
    `)
        // Delete answer (only if user is the author)
        const result = await sql`
      DELETE FROM forum_answers
      WHERE id = ${answerId}
        AND post_id = ${postId}
        AND course_id = ${courseId}
        AND user_id = ${session.id}
    `;

        return NextResponse.json({
            success: true,
        });
    } catch (error: any) {
        console.error('[Forum Answer DELETE] Error:', error);
        return NextResponse.json(
            { error: 'Failed to delete forum answer' },
            { status: 500 }
        );
    }
}

