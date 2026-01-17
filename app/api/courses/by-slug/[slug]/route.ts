import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// GET /api/courses/by-slug/[slug] - Get course ID from slug
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const sql = getDb();

    const courses = await sql`
      SELECT
        id,
        slug,
        title,
        short_description,
        course_data,
        cover_image,
        meta_title,
        meta_description,
        language,
        status,
        published_at,
        enrollment_count,
        view_count,
        created_at,
        updated_at
      FROM courses
      WHERE slug = ${slug}
      LIMIT 1
    `;

    if (courses.length === 0) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      course: courses[0],
    });
  } catch (error: any) {
    console.error('[Course by slug GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch course' },
      { status: 500 }
    );
  }
}
