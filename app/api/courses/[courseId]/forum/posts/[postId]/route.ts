import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/session';
import { verifyCSRF } from '@/lib/api-helpers';
import { getDb } from '@/lib/db';
import { requireCourseForumAccess } from '@/lib/forum-access';

// GET /api/courses/[courseId]/forum/posts/[postId] - Get single post with details
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

    // Fetch post
    const posts = await sql`
      SELECT
        fp.*,
        u.first_name as author_first_name,
        u.last_name as author_last_name,
        CASE
          WHEN EXISTS (
            SELECT 1 FROM course_instructors ci
            WHERE ci.course_id = fp.course_id AND ci.instructor_id = fp.user_id
          ) THEN true
          ELSE false
        END as author_is_instructor
      FROM forum_posts fp
      JOIN users u ON fp.user_id = u.id
      WHERE fp.id = ${postId} AND fp.course_id = ${courseId}
    `;

    if (posts.length === 0) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Increment view count
    await sql`
      UPDATE forum_posts
      SET view_count = view_count + 1
      WHERE id = ${postId}
    `;

    return NextResponse.json({
      success: true,
      post: posts[0],
    });
  } catch (error: any) {
    console.error('[Forum Post GET] Error:', error);

    if (error.message?.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Failed to fetch forum post' },
      { status: 500 }
    );
  }
}

// PATCH /api/courses/[courseId]/forum/posts/[postId] - Update post (author only)
export async function PATCH(
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
    const { title, body: postBody, is_resolved } = body;

    const sql = getDb();

    // Build update dynamically
    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (postBody !== undefined) updates.body = postBody;
    if (is_resolved !== undefined) updates.is_resolved = is_resolved;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Update post (only if user is the author)
    const result = await sql`
      UPDATE forum_posts
      SET ${sql(updates)}, updated_at = NOW()
      WHERE id = ${postId}
        AND course_id = ${courseId}
        AND user_id = ${session.id}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Post not found or you do not have permission to update it' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      post: result[0],
    });
  } catch (error: any) {
    console.error('[Forum Post PATCH] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update forum post' },
      { status: 500 }
    );
  }
}
