/**
 * Promote Instructor to Admin Script
 *
 * This script promotes an instructor to admin role.
 *
 * Usage:
 *   npx tsx scripts/promote-to-admin.ts <instructor-email>
 *
 * Example:
 *   npx tsx scripts/promote-to-admin.ts john@example.com
 */

import postgres from 'postgres';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Load environment variables from env files manually
function loadEnvFile() {
  const envFiles = ['.env.development.local', '.env.local', '.env'];
  let loaded = false;

  for (const envFile of envFiles) {
    const envPath = join(process.cwd(), envFile);

    if (existsSync(envPath)) {
      const envContent = readFileSync(envPath, 'utf-8');
      const lines = envContent.split('\n');

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith('#')) continue;

        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
          if (!process.env[key.trim()]) {
            process.env[key.trim()] = value;
          }
        }
      }
      loaded = true;
    }
  }

  if (!loaded) {
    console.error('❌ ERROR: No .env files found');
    process.exit(1);
  }
}

async function promoteToAdmin() {
  // Get email from command line args
  const email = process.argv[2];

  if (!email) {
    console.error('❌ ERROR: Please provide an instructor email');
    console.error('\nUsage:');
    console.error('  npx tsx scripts/promote-to-admin.ts <instructor-email>');
    console.error('\nExample:');
    console.error('  npx tsx scripts/promote-to-admin.ts john@example.com');
    process.exit(1);
  }

  console.log('🚀 Promoting instructor to admin...\n');

  // Load env
  loadEnvFile();

  // Get database URL
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ ERROR: DATABASE_URL not found');
    process.exit(1);
  }

  // Determine SSL config
  const isLocal = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1');
  const sslConfig = isLocal ? false : 'require';

  // Create database connection
  const sql = postgres(databaseUrl, {
    ssl: sslConfig,
  });

  try {
    // Check if instructor exists
    const instructors = await sql`
      SELECT id, first_name, last_name, email, role
      FROM instructors
      WHERE email = ${email}
    `;

    if (instructors.length === 0) {
      console.error(`❌ ERROR: No instructor found with email: ${email}`);
      console.error('\n💡 Available instructors:');

      const allInstructors = await sql`
        SELECT email, first_name, last_name, role
        FROM instructors
        ORDER BY created_at DESC
        LIMIT 10
      `;

      for (const inst of allInstructors) {
        console.error(`   - ${inst.email} (${inst.first_name} ${inst.last_name}) - Role: ${inst.role}`);
      }

      process.exit(1);
    }

    const instructor = instructors[0];

    // Check current role
    if (instructor.role === 'admin') {
      console.log(`✓ ${instructor.first_name} ${instructor.last_name} (${instructor.email}) is already an admin!`);
      process.exit(0);
    }

    // Update to admin
    console.log(`📝 Promoting ${instructor.first_name} ${instructor.last_name} to admin...`);

    await sql`
      UPDATE instructors
      SET role = 'admin', updated_at = NOW()
      WHERE id = ${instructor.id}
    `;

    // Verify update
    const updated = await sql`
      SELECT id, first_name, last_name, email, role
      FROM instructors
      WHERE id = ${instructor.id}
    `;

    if (updated[0].role === 'admin') {
      console.log('\n✅ Success! Instructor promoted to admin:');
      console.log(`   Name: ${updated[0].first_name} ${updated[0].last_name}`);
      console.log(`   Email: ${updated[0].email}`);
      console.log(`   Role: ${updated[0].role}`);
      console.log('\n✨ The instructor can now:');
      console.log('   - View all courses');
      console.log('   - Assign instructors to courses');
      console.log('   - Access admin features');
      console.log('\n👉 Log in as this instructor to test admin features!');
    } else {
      console.error('❌ ERROR: Failed to update role');
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Run the script
promoteToAdmin().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
