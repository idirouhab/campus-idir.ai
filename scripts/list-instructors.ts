/**
 * List Instructors Script
 *
 * This script lists all instructors in the database with their current roles.
 *
 * Usage:
 *   npx tsx scripts/list-instructors.ts
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

async function listInstructors() {
  console.log('📋 Fetching instructors...\n');

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
    const instructors = await sql`
      SELECT
        id,
        first_name,
        last_name,
        email,
        role,
        is_active,
        created_at
      FROM instructors
      ORDER BY created_at DESC
    `;

    if (instructors.length === 0) {
      console.log('ℹ️  No instructors found in the database.');
      process.exit(0);
    }

    console.log(`Found ${instructors.length} instructor(s):\n`);

    const adminCount = instructors.filter(i => i.role === 'admin').length;
    const instructorCount = instructors.filter(i => i.role === 'instructor').length;

    console.log(`Summary: ${adminCount} admin(s), ${instructorCount} instructor(s)\n`);
    console.log('─'.repeat(80));

    for (const inst of instructors) {
      const roleIcon = inst.role === 'admin' ? '👑' : '👤';
      const activeIcon = inst.is_active ? '✓' : '✗';

      console.log(`${roleIcon} ${inst.first_name} ${inst.last_name}`);
      console.log(`   Email: ${inst.email}`);
      console.log(`   Role: ${inst.role} | Active: ${activeIcon} ${inst.is_active ? 'Yes' : 'No'}`);
      console.log(`   ID: ${inst.id}`);
      console.log(`   Created: ${new Date(inst.created_at).toLocaleDateString()}`);
      console.log('─'.repeat(80));
    }

    console.log('\n💡 To promote an instructor to admin, run:');
    console.log('   npx tsx scripts/promote-to-admin.ts <instructor-email>\n');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Run the script
listInstructors().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
