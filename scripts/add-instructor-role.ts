import { getDb } from '../lib/db';

async function addInstructorRole() {
  const sql = getDb();

  try {
    console.log('Adding role field to instructors table...');

    // Add role column with default value 'instructor'
    // Using IF NOT EXISTS equivalent for PostgreSQL
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'instructors' AND column_name = 'role'
        ) THEN
          ALTER TABLE instructors
          ADD COLUMN role VARCHAR(50) DEFAULT 'instructor' NOT NULL;

          -- Add a check constraint to ensure role is one of the allowed values
          ALTER TABLE instructors
          ADD CONSTRAINT valid_instructor_role CHECK (role IN ('instructor', 'admin'));

          -- Add an index for role-based queries
          CREATE INDEX idx_instructors_role ON instructors(role);

          -- Add comment
          COMMENT ON COLUMN instructors.role IS 'Role of the instructor: instructor (regular instructor) or admin (can manage all courses and assignments)';
        END IF;
      END $$;
    `;

    console.log('✓ Role field added successfully');
    console.log('\nRole field details:');
    console.log('- Column: role');
    console.log('- Type: VARCHAR(50)');
    console.log('- Default: instructor');
    console.log('- Allowed values: instructor, admin');
    console.log('- Constraint: valid_instructor_role');
    console.log('\nTo change role values in the future:');
    console.log('1. Drop the constraint: ALTER TABLE instructors DROP CONSTRAINT valid_instructor_role;');
    console.log('2. Add new constraint with updated values: ALTER TABLE instructors ADD CONSTRAINT valid_instructor_role CHECK (role IN (\'instructor\', \'admin\', \'new_role\'));');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

addInstructorRole();
