import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupStorage() {
  if (!supabaseAdmin) {
    console.error('Supabase admin client not configured');
    process.exit(1);
  }

  try {
    console.log('Setting up Supabase storage bucket...');

    // Check if bucket exists
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();

    if (listError) {
      console.error('Error listing buckets:', listError);
      process.exit(1);
    }

    const avatarBucket = buckets?.find(bucket => bucket.name === 'avatars');

    if (avatarBucket) {
      console.log('✓ Avatars bucket already exists');
    } else {
      // Create the bucket
      const { data: bucket, error: createError } = await supabaseAdmin.storage.createBucket('avatars', {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'],
      });

      if (createError) {
        console.error('Error creating bucket:', createError);
        process.exit(1);
      }

      console.log('✓ Avatars bucket created successfully');
    }

    console.log('\nStorage setup complete!');
    console.log('Bucket: avatars');
    console.log('Public: Yes');
    console.log('Max file size: 5MB');
    console.log('Allowed types: PNG, JPEG, JPG, GIF, WEBP');
  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  }
}

setupStorage();
