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
      SELECT id, slug, title, language
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
