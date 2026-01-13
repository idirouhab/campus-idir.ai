import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireUserType } from '@/lib/session';
import { verifyCSRF } from '@/lib/api-helpers';
import { validateDocumentUpload } from '@/lib/file-validation';
import { getDb } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    console.log('[Upload Course Material] Starting upload process');

    // 1. Verify CSRF token
    const isValidCSRF = await verifyCSRF(request);
    if (!isValidCSRF) {
      console.error('[Upload Course Material] CSRF validation failed');
      return NextResponse.json(
        { error: 'Invalid CSRF token' },
        { status: 403 }
      );
    }

    // 2. Verify authentication
    console.log('[Upload Course Material] Verifying authentication');
    const session = await requireUserType('instructor');
    console.log('[Upload Course Material] User authenticated:', session.id);

    // 3. Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const courseId = formData.get('courseId') as string;
    const sessionId = formData.get('sessionId') as string | null;
    const displayFilename = formData.get('displayFilename') as string | null;

    if (!file || !courseId) {
      return NextResponse.json(
        { error: 'File and course ID are required' },
        { status: 400 }
      );
    }

    const sql = getDb();

    // 4. Verify instructor has access to course
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

    // 5. Validate file
    const validation = await validateDocumentUpload(file, {
      maxSizeBytes: 10 * 1024 * 1024, // 10MB
      allowedExtensions: ['pdf', 'doc', 'docx', 'ppt', 'pptx'],
    });

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      console.error('[Upload Course Material] supabaseAdmin is null. Check environment variables:', {
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      });
      return NextResponse.json(
        { error: 'Storage service not configured' },
        { status: 500 }
      );
    }

    // 6. Sanitize filename and determine storage path
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const timestamp = Date.now();
    const extension = sanitizedFilename.split('.').pop();
    const storageFilename = `${timestamp}-${sanitizedFilename}`;

    // Use sessions subdirectory if sessionId provided
    const filePath = sessionId
      ? `course-materials/${courseId}/sessions/${sessionId}/${storageFilename}`
      : `course-materials/${courseId}/${storageFilename}`;

    // 7. Upload to Supabase Storage (course-materials bucket)
    console.log('[Upload Course Material] Preparing file for upload:', {
      fileName: file.name,
      fileSize: file.size,
      filePath
    });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('course-materials')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('[Upload Course Material] Supabase upload error:', {
        error: uploadError,
        message: uploadError.message,
        statusCode: uploadError.statusCode
      });
      return NextResponse.json(
        { error: `Failed to upload file: ${uploadError.message}` },
        { status: 500 }
      );
    }

    console.log('[Upload Course Material] File uploaded successfully to Supabase');

    // 8. Get public URL
    const { data: publicUrlData } = supabaseAdmin.storage
      .from('course-materials')
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;

    // 9. Insert into database
    const finalDisplayFilename = displayFilename || sanitizedFilename;
    const fileType = validation.documentType || extension || 'unknown';

    console.log('[Upload Course Material] Inserting into database:', {
      courseId,
      sessionId,
      fileType,
      fileSize: file.size
    });

    const [material] = await sql`
      INSERT INTO course_materials (
        course_id,
        session_id,
        uploaded_by,
        original_filename,
        display_filename,
        file_url,
        file_type,
        file_size_bytes,
        mime_type
      ) VALUES (
        ${courseId},
        ${sessionId || null},
        ${session.id},
        ${sanitizedFilename},
        ${finalDisplayFilename},
        ${publicUrl},
        ${fileType},
        ${file.size},
        ${file.type}
      )
      RETURNING *
    `;

    console.log('[Upload Course Material] Material saved successfully:', material.id);

    return NextResponse.json({
      success: true,
      material,
    });
  } catch (error: any) {
    console.error('[Upload Course Material] Error:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}
