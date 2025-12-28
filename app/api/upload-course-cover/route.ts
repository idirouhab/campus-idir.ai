import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireUserType } from '@/lib/session';
import { verifyCSRF } from '@/lib/api-helpers';
import { validateImageUpload } from '@/lib/file-validation';
import { getDb } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // 1. Verify CSRF token
    const isValidCSRF = await verifyCSRF(request);
    if (!isValidCSRF) {
      return NextResponse.json(
        { error: 'Invalid CSRF token' },
        { status: 403 }
      );
    }

    // 2. Verify authentication and get session
    const session = await requireUserType('instructor');

    // 3. Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const instructorId = formData.get('instructorId') as string;
    const courseId = formData.get('courseId') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    if (!instructorId) {
      return NextResponse.json(
        { error: 'Instructor ID is required' },
        { status: 400 }
      );
    }

    // 4. Verify ownership - user can only upload course covers for themselves
    if (session.id !== instructorId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // 5. If courseId provided, verify instructor has access to this course
    if (courseId) {
      const sql = getDb();

      // Check if this is an admin or if they're assigned to this course
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
    }

    // 6. Validate file with enhanced security checks
    const validation = await validateImageUpload(file, {
      maxSizeBytes: 5 * 1024 * 1024, // 5MB
      allowedExtensions: ['jpg', 'jpeg', 'png', 'webp'],
      maxWidth: 2000,
      maxHeight: 2000,
    });

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Storage service not configured' },
        { status: 500 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const filename = courseId
      ? `course-${courseId}-${timestamp}.${extension}`
      : `course-new-${instructorId}-${timestamp}.${extension}`;
    const filePath = `course-covers/${filename}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('avatars')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return NextResponse.json(
        { error: uploadError.message || 'Failed to upload to storage' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: publicUrlData } = supabaseAdmin.storage
      .from('avatars')
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;

    return NextResponse.json({
      success: true,
      url: publicUrl,
    });
  } catch (error: any) {
    console.error('[Upload Course Cover] Error:', error);
    // Sanitized error message
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}
