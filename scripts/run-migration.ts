/**
 * Migration Runner Script
 *
 * This script runs the instructor role migration to add the role field to the instructors table.
 *
 * Usage:
 *   npx tsx scripts/run-migration.ts
 */

import postgres from 'postgres';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Load environment variables from env files manually
function loadEnvFile() {
  // Try multiple env files in order
  const envFiles = ['.env.development.local', '.env.local', '.env'];

  let loaded = false;

  for (const envFile of envFiles) {
    const envPath = join(process.cwd(), envFile);

    if (existsSync(envPath)) {
      console.log(`✓ Loading environment from ${envFile}`);
      const envContent = readFileSync(envPath, 'utf-8');
      const lines = envContent.split('\n');

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith('#')) continue;

        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
          // Only set if not already set
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

async function runMigration() {
  console.log('🚀 Starting migration...\n');

  // Load .env.local
  loadEnvFile();

  // Get database URL from environment
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ ERROR: DATABASE_URL not found in .env.local');
    console.error('   Please make sure .env.local contains DATABASE_URL');
    process.exit(1);
  }

  console.log('✓ Database URL found');

  // Determine if we need SSL (only for remote connections)
  const isLocal = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1');
  const sslConfig = isLocal ? false : 'require';

  console.log(`✓ Connection type: ${isLocal ? 'local' : 'remote'} (SSL: ${sslConfig})`);

  // Create database connection
  const sql = postgres(databaseUrl, {
    ssl: sslConfig,
  });

  try {
    // Read the migration SQL file
    const migrationPath = join(process.cwd(), 'dummy', 'add_instructor_role.sql');
    console.log(`✓ Reading migration file: ${migrationPath}`);

    const migrationSql = readFileSync(migrationPath, 'utf-8');

    // Execute the migration
    console.log('\n📝 Executing migration...');
    await sql.unsafe(migrationSql);

    console.log('✅ Migration completed successfully!\n');

    // Verify the role column was added
    console.log('🔍 Verifying migration...');
    const result = await sql`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'instructors' AND column_name = 'role'
    `;

    if (result.length > 0) {
      console.log('✅ Role column verified:');
      console.log(`   - Column: ${result[0].column_name}`);
      console.log(`   - Type: ${result[0].data_type}`);
      console.log(`   - Default: ${result[0].column_default}`);
      console.log('\n✨ Migration successful! You can now use the role-based features.\n');
      console.log('📌 Next step: Update an instructor to be admin:');
      console.log('   UPDATE instructors SET role = \'admin\' WHERE email = \'your-email@example.com\';\n');
    } else {
      console.log('⚠️  Warning: Could not verify role column, but migration may have succeeded');
    }

  } catch (error: any) {
    console.error('\n❌ Migration failed:');
    console.error(error.message);

    if (error.message.includes('already exists')) {
      console.log('\n💡 The role column may already exist. Checking...');

      try {
        const result = await sql`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'instructors' AND column_name = 'role'
        `;

        if (result.length > 0) {
          console.log('✓ Role column already exists! No migration needed.');
        }
      } catch (checkError) {
        console.error('Could not verify column existence');
      }
    }

    process.exit(1);
  } finally {
    // Close the database connection
    await sql.end();
  }
}

// Run the migration
runMigration().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
