import { NextRequest, NextResponse } from 'next/server';
import { requireUserType } from '@/lib/session';
import { verifyCSRF } from '@/lib/api-helpers';
import { getDb } from '@/lib/db';
import { supabaseAdmin } from '@/lib/supabase';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ materialId: string }> }
) {
  try {
    const isValidCSRF = await verifyCSRF(request);
    if (!isValidCSRF) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }

    const session = await requireUserType('instructor');
    const { materialId } = await params;
    const { displayFilename } = await request.json();

    if (!displayFilename || displayFilename.trim().length === 0) {
      return NextResponse.json(
        { error: 'Display filename is required' },
        { status: 400 }
      );
    }

    const sql = getDb();

    // Get material and verify access
    const [material] = await sql`
      SELECT cm.*, ci.instructor_id
      FROM course_materials cm
      JOIN course_instructors ci ON cm.course_id = ci.course_id
      WHERE cm.id = ${materialId} AND ci.instructor_id = ${session.id}
    `;

    const isAdmin =
      session.roles.includes('super_admin') || session.roles.includes('billing_admin');
    if (!material && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update display filename
    const [updated] = await sql`
      UPDATE course_materials
      SET display_filename = ${displayFilename.trim()}
      WHERE id = ${materialId}
      RETURNING *
    `;

    return NextResponse.json({
      success: true,
      material: updated,
    });
  } catch (error) {
    console.error('[Update Course Material] Error:', error);
    return NextResponse.json(
      { error: 'Update failed' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ materialId: string }> }
) {
  try {
    const isValidCSRF = await verifyCSRF(request);
    if (!isValidCSRF) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }

    const session = await requireUserType('instructor');
    const { materialId } = await params;
    const sql = getDb();

    // Get material and verify access
    const [material] = await sql`
      SELECT cm.*, ci.instructor_id
      FROM course_materials cm
      JOIN course_instructors ci ON cm.course_id = ci.course_id
      WHERE cm.id = ${materialId} AND ci.instructor_id = ${session.id}
    `;

    const isAdmin =
      session.roles.includes('super_admin') || session.roles.includes('billing_admin');
    if (!material && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Storage service not configured' },
        { status: 500 }
      );
    }

    // Delete from storage
    const filePathMatch = material.file_url.match(/course-materials\/[^?]+/);
    if (filePathMatch) {
      const filePath = filePathMatch[0];
      await supabaseAdmin.storage.from('course-materials').remove([filePath]);
    }

    // Delete from database
    await sql`
      DELETE FROM course_materials WHERE id = ${materialId}
    `;

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('[Delete Course Material] Error:', error);
    return NextResponse.json(
      { error: 'Delete failed' },
      { status: 500 }
    );
  }
}
