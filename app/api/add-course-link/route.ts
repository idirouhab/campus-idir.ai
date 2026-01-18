import { NextRequest, NextResponse } from 'next/server';
import { requireUserType } from '@/lib/session';
import { verifyCSRF } from '@/lib/api-helpers';
import { getDb } from '@/lib/db';
import {
  isGoogleDriveUrl,
  fetchGoogleDriveMetadata,
  sanitizeDisplayFilename,
} from '@/lib/google-drive-utils';

export async function POST(request: NextRequest) {
  try {
    // 1. Verify CSRF token
    const isValidCSRF = await verifyCSRF(request);
    if (!isValidCSRF) {
      console.error('[Add Course Link] CSRF validation failed');
      return NextResponse.json(
        { error: 'Invalid CSRF token' },
        { status: 403 }
      );
    }

    // 2. Verify authentication
    const session = await requireUserType('instructor');

    // 3. Parse request body
    const body = await request.json();
    const { url, displayName, courseId, sessionId } = body;

    // 4. Validation
    if (!url || !courseId) {
      return NextResponse.json(
        { error: 'URL and course ID are required' },
        { status: 400 }
      );
    }

    // 5. Validate Google Drive URL
    if (!isGoogleDriveUrl(url)) {
      return NextResponse.json(
        { error: 'Only Google Drive links are supported' },
        { status: 400 }
      );
    }

    const sql = getDb();

    // 6. Verify instructor access to course
    if (session.role !== 'admin') {
      const courseAccess = await sql`
        SELECT 1 FROM course_instructors
        WHERE course_id = ${courseId} AND instructor_id = ${session.id}
      `;

      if (courseAccess.length === 0) {
        console.error('[Add Course Link] Access denied for user:', session.id);
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }
    }

    // 7. Fetch Google Drive metadata
    let metadata;
    try {
      metadata = await fetchGoogleDriveMetadata(url);
    } catch (error: any) {
      console.error('[Add Course Link] Metadata fetch failed:', error.message);
      return NextResponse.json(
        { error: error.message || 'Failed to fetch file information from Google Drive' },
        { status: 400 }
      );
    }

    // 8. Determine display filename
    let finalDisplayName = displayName?.trim();

    if (!finalDisplayName && metadata.fileName) {
      finalDisplayName = sanitizeDisplayFilename(metadata.fileName);
      console.log('[Add Course Link] Using auto-detected name:', finalDisplayName);
    }

    if (!finalDisplayName) {
      finalDisplayName = `Google Drive File (${metadata.fileId.substring(0, 8)})`;
      console.log('[Add Course Link] Using fallback name:', finalDisplayName);
    }

    // 9. Insert into database
    console.log('[Add Course Link] Inserting into database');
    const [material] = await sql`
      INSERT INTO course_materials (
        course_id,
        session_id,
        uploaded_by,
        display_filename,
        file_url,
        resource_type,
        external_link_url,
        file_type,
        original_filename,
        file_size_bytes,
        mime_type
      ) VALUES (
        ${courseId},
        ${sessionId || null},
        ${session.id},
        ${finalDisplayName},
        ${url},
        'link',
        ${url},
        ${metadata.fileType},
        ${metadata.fileName || null},
        NULL,
        NULL
      )
      RETURNING *
    `;

    console.log('[Add Course Link] Link added successfully:', material.id);

    return NextResponse.json({
      success: true,
      material,
    });
  } catch (error: any) {
    console.error('[Add Course Link] Error:', error);
    return NextResponse.json(
      { error: 'Failed to add link' },
      { status: 500 }
    );
  }
}
