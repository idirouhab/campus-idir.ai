import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { supabaseAdmin } from '@/lib/supabase';
import { requireUserType } from '@/lib/session';
import { verifyCSRF } from '@/lib/api-helpers';
import { validateImageUpload } from '@/lib/file-validation';

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

    // 4. Verify ownership - user can only upload their own profile picture
    if (session.id !== instructorId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // 5. Validate file with enhanced security checks
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
    const filename = `instructor-${instructorId}-${timestamp}.${extension}`;
    const filePath = `profile-pictures/${filename}`;

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

    // Update database
    const sql = getDb();
    await sql`
      UPDATE instructors
      SET picture_url = ${publicUrl},
          updated_at = NOW()
      WHERE id = ${instructorId}
    `;

    return NextResponse.json({
      success: true,
      url: publicUrl,
    });
  } catch (error: any) {
    console.error('[Upload Profile Picture] Error:', error);
    // Sanitized error message
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}
