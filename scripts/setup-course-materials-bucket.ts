import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupCourseMaterialsBucket() {
  if (!supabaseAdmin) {
    console.error('Supabase admin client not configured');
    process.exit(1);
  }

  try {
    console.log('Setting up course materials storage...\n');

    // Step 1: Revert avatars bucket to images only
    console.log('Step 1: Reverting avatars bucket to images only...');
    const { error: updateAvatarsError } = await supabaseAdmin.storage.updateBucket('avatars', {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'],
    });

    if (updateAvatarsError) {
      console.error('Error updating avatars bucket:', updateAvatarsError);
      process.exit(1);
    }
    console.log('✓ Avatars bucket reverted to images only (5MB limit)\n');

    // Step 2: Check if course-materials bucket exists
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();

    if (listError) {
      console.error('Error listing buckets:', listError);
      process.exit(1);
    }

    const courseMaterialsBucket = buckets?.find(bucket => bucket.name === 'course-materials');

    if (courseMaterialsBucket) {
      console.log('✓ Course materials bucket already exists');
    } else {
      // Step 3: Create the course-materials bucket
      console.log('Step 2: Creating course-materials bucket...');
      const { data: bucket, error: createError } = await supabaseAdmin.storage.createBucket('course-materials', {
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
          'application/msword', // DOC
          'application/vnd.openxmlformats-officedocument.presentationml.presentation', // PPTX
          'application/vnd.ms-powerpoint', // PPT
        ],
      });

      if (createError) {
        console.error('Error creating bucket:', createError);
        process.exit(1);
      }

      console.log('✓ Course materials bucket created successfully!\n');
    }

    console.log('Storage setup complete!\n');
    console.log('Bucket Configuration:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📁 avatars:');
    console.log('   - Purpose: Profile pictures and course covers');
    console.log('   - Max size: 5MB');
    console.log('   - Types: PNG, JPEG, JPG, GIF, WEBP');
    console.log('\n📚 course-materials:');
    console.log('   - Purpose: Course documents');
    console.log('   - Max size: 10MB');
    console.log('   - Types: PDF, DOC, DOCX, PPT, PPTX');
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  }
}

setupCourseMaterialsBucket();
