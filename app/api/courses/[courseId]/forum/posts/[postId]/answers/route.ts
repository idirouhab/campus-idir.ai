import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/session';
import { verifyCSRF } from '@/lib/api-helpers';
import { getDb } from '@/lib/db';
import { requireCourseForumAccess } from '@/lib/forum-access';

// GET /api/courses/[courseId]/forum/posts/[postId]/answers - List all answers
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string; postId: string }> }
) {
  try {
    const session = await requireSession();
    const { courseId, postId } = await params;
    const sql = getDb();

    // Verify access
    await requireCourseForumAccess(session, courseId);

    // Fetch answers
    // Optimized: Using LEFT JOIN instead of EXISTS subquery to eliminate N+1 pattern
    const answers = await sql`
      SELECT
        fa.id,
        fa.post_id,
        fa.course_id,
        fa.user_id,
        fa.body,
        fa.is_verified,
        fa.created_at,
        fa.updated_at,
        u.first_name as author_first_name,
        u.last_name as author_last_name,
        CASE WHEN ci.instructor_id IS NOT NULL THEN true ELSE false END as author_is_instructor
      FROM forum_answers fa
      JOIN users u ON fa.user_id = u.id
      LEFT JOIN course_instructors ci ON ci.course_id = fa.course_id AND ci.instructor_id = fa.user_id
      WHERE fa.post_id = ${postId} AND fa.course_id = ${courseId}
      ORDER BY fa.is_verified DESC, fa.created_at ASC
    `;

    return NextResponse.json({
      success: true,
      answers,
    });
  } catch (error: any) {
    console.error('[Forum Answers GET] Error:', error);

    if (error.message?.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Failed to fetch forum answers' },
      { status: 500 }
    );
  }
}

// POST /api/courses/[courseId]/forum/posts/[postId]/answers - Create answer
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string; postId: string }> }
) {
  try {
    const session = await requireSession();
    const { courseId, postId } = await params;

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

    // Verify post exists
    const posts = await sql`
      SELECT id FROM forum_posts
      WHERE id = ${postId} AND course_id = ${courseId}
    `;

    if (posts.length === 0) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Create answer (trigger will auto-set is_verified if user is instructor)
    const [newAnswer] = await sql`
      INSERT INTO forum_answers (post_id, course_id, user_id, body)
      VALUES (${postId}, ${courseId}, ${session.id}, ${answerBody})
      RETURNING *
    `;

    return NextResponse.json({
      success: true,
      answer: newAnswer,
    });
  } catch (error: any) {
    console.error('[Forum Answers POST] Error:', error);

    if (error.message?.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Failed to create forum answer' },
      { status: 500 }
    );
  }
}
