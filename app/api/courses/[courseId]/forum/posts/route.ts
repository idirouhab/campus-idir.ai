import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/session';
import { verifyCSRF } from '@/lib/api-helpers';
import { getDb } from '@/lib/db';
import { requireCourseForumAccess } from '@/lib/forum-access';

// GET /api/courses/[courseId]/forum/posts - List all posts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const session = await requireSession();
    const { courseId } = await params;
    const sql = getDb();

    // Verify access
    await requireCourseForumAccess(session, courseId);

    // Fetch posts with author info and answer count
    // Optimized: Using LEFT JOIN instead of EXISTS subquery to eliminate N+1 pattern
    const posts = await sql`
      SELECT
        fp.id,
        fp.course_id,
        fp.title,
        fp.body,
        fp.is_pinned,
        fp.is_resolved,
        fp.view_count,
        fp.created_at,
        fp.updated_at,
        -- Author info
        u.id as author_id,
        u.first_name as author_first_name,
        u.last_name as author_last_name,
        -- Check if author is instructor (optimized with LEFT JOIN)
        CASE WHEN ci.instructor_id IS NOT NULL THEN true ELSE false END as author_is_instructor,
        -- Answer count
        COUNT(DISTINCT fa.id) as answer_count,
        -- Has verified answer
        BOOL_OR(fa.is_verified) as has_verified_answer
      FROM forum_posts fp
      JOIN users u ON fp.user_id = u.id
      LEFT JOIN course_instructors ci ON ci.course_id = fp.course_id AND ci.instructor_id = fp.user_id
      LEFT JOIN forum_answers fa ON fp.id = fa.post_id
      WHERE fp.course_id = ${courseId}
      GROUP BY fp.id, u.id, u.first_name, u.last_name, ci.instructor_id
      ORDER BY fp.is_pinned DESC, fp.created_at DESC
    `;

    return NextResponse.json({
      success: true,
      posts,
    });
  } catch (error: any) {
    console.error('[Forum Posts GET] Error:', error);

    if (error.message?.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to fetch forum posts' },
      { status: 500 }
    );
  }
}

// POST /api/courses/[courseId]/forum/posts - Create new post
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const session = await requireSession();
    const { courseId } = await params;

    // Verify CSRF
    const isValidCSRF = await verifyCSRF(request);
    if (!isValidCSRF) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }

    // Verify access
    await requireCourseForumAccess(session, courseId);

    const body = await request.json();
    const { title, body: postBody } = body;

    // Validate input
    if (!title || !postBody) {
      return NextResponse.json(
        { error: 'Title and body are required' },
        { status: 400 }
      );
    }

    if (title.length > 255) {
      return NextResponse.json(
        { error: 'Title must be 255 characters or less' },
        { status: 400 }
      );
    }

    if (title.length < 5) {
      return NextResponse.json(
        { error: 'Title must be at least 5 characters' },
        { status: 400 }
      );
    }

    if (postBody.length < 20) {
      return NextResponse.json(
        { error: 'Body must be at least 20 characters' },
        { status: 400 }
      );
    }

    const sql = getDb();

    // Create post
    const [newPost] = await sql`
      INSERT INTO forum_posts (course_id, user_id, title, body)
      VALUES (${courseId}, ${session.id}, ${title}, ${postBody})
      RETURNING *
    `;

    return NextResponse.json({
      success: true,
      post: newPost,
    });
  } catch (error: any) {
    console.error('[Forum Posts POST] Error:', error);

    if (error.message?.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Failed to create forum post' },
      { status: 500 }
    );
  }
}
