# Instructor Role System Setup

## Summary

A role-based access system has been implemented for instructors with two levels:

1. **Account-Level Roles**: `instructor` (default) and `admin`
2. **Course-Level Roles**: For assigning multiple instructors to courses

## What Was Added

### 1. Database Migration (`dummy/add_instructor_role.sql`)
- Adds `role` column to `instructors` table
- Default value: `'instructor'`
- Allowed values: `'instructor'`, `'admin'`
- Includes constraint for easy future extension

### 2. TypeScript Types (`types/database.ts`)
- `InstructorRole` type for account-level roles
- `CourseInstructorRole` type for course-level roles
- Updated `Instructor` interface with `role` field
- New `CourseInstructor` interface for the junction table

### 3. Documentation (`docs/INSTRUCTOR_ROLES.md`)
- Complete guide on the role system
- Usage examples
- Extension instructions
- Security considerations

## Running the Migration

### Option 1: Using psql (if you have DATABASE_URL)
```bash
psql $DATABASE_URL -f dummy/add_instructor_role.sql
```

### Option 2: Using Supabase CLI
```bash
supabase db push
```

### Option 3: Manual (Supabase Studio or pgAdmin)
1. Open Supabase Studio SQL Editor
2. Copy contents of `dummy/add_instructor_role.sql`
3. Execute the SQL

### Option 4: Using the migration script
```bash
# Make sure DATABASE_URL is set in your environment
DATABASE_URL="your-database-url" npx tsx scripts/add-instructor-role.ts
```

## Verifying the Migration

After running the migration, verify it worked:

```sql
-- Check if column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'instructors' AND column_name = 'role';

-- Check all instructors have the role field
SELECT id, email, role FROM instructors LIMIT 5;
```

## Using the Role System (IMPORTANT!)

**⚠️ Don't check roles directly!** Use the permission-based system instead.

### Quick Examples

```typescript
// ✅ GOOD - Permission-based (flexible, maintainable)
import { useInstructorPermissions } from '@/hooks/useInstructorPermissions';

const permissions = useInstructorPermissions(instructor);
if (permissions.canViewAllCourses()) {
  // Show all courses
}

if (permissions.canAssignInstructors()) {
  // Show instructor assignment UI
}

// ❌ BAD - Role-based (breaks when adding new roles)
if (instructor.role === 'admin') {
  // This hardcodes the role check - DON'T DO THIS
}
```

```tsx
// ✅ GOOD - Using Permission Gate in components
<PermissionGate instructor={instructor} permission="courses.create">
  <CreateButton />
</PermissionGate>

// ✅ GOOD - Server-side permission check
import { canAssignInstructors } from '@/lib/roles';

if (!canAssignInstructors(instructor)) {
  return { error: 'Unauthorized' };
}
```

**📖 See [docs/ROLE_USAGE_GUIDE.md](docs/ROLE_USAGE_GUIDE.md) for complete examples and best practices.**

## What's Next

1. **Mark existing users as admins**:
```sql
UPDATE instructors SET role = 'admin' WHERE email = 'admin@example.com';
```

2. **Use the permission system in your code**:
```typescript
import { useInstructorPermissions } from '@/hooks/useInstructorPermissions';

const permissions = useInstructorPermissions(instructor);

// Check permissions, not roles
if (permissions.canViewAllEnrollments()) {
  // Fetch and display all enrollments
}

if (permissions.canAssignInstructors()) {
  // Show instructor assignment interface
}
```

3. **Build admin features**:
   - View all course enrollments
   - Assign instructors to courses
   - Manage students system-wide
   - View analytics

## Future Extensions

To add new roles (e.g., 'super_admin', 'coordinator'):

1. Drop the constraint:
```sql
ALTER TABLE instructors DROP CONSTRAINT valid_instructor_role;
```

2. Add new constraint:
```sql
ALTER TABLE instructors
ADD CONSTRAINT valid_instructor_role
CHECK (role IN ('instructor', 'admin', 'super_admin', 'coordinator'));
```

3. Update TypeScript type:
```typescript
export type InstructorRole = 'instructor' | 'admin' | 'super_admin' | 'coordinator';
```

## Files Created

### Database & Types
- ✅ `dummy/add_instructor_role.sql` - Migration file
- ✅ `types/database.ts` - Updated TypeScript types with InstructorRole

### Permission System
- ✅ `lib/roles/config.ts` - Centralized role and permission configuration
- ✅ `lib/roles/permissions.ts` - Permission checking utilities
- ✅ `lib/roles/index.ts` - Exports for easy importing
- ✅ `hooks/useInstructorPermissions.ts` - React hooks for permission checks

### Documentation
- ✅ `docs/INSTRUCTOR_ROLES.md` - Complete role system architecture
- ✅ `docs/ROLE_USAGE_GUIDE.md` - **Usage guide with examples**
- ✅ `scripts/add-instructor-role.ts` - Migration script (optional)

## Notes

- The `role` field has a default value of `'instructor'`, so existing instructors will automatically have this role
- The constraint makes it easy to extend by simply modifying the CHECK constraint
- The `course_instructors` table already exists and links courses to instructors with course-specific roles
- All instructors can see courses they're assigned to via `course_instructors`
- Only `admin` role instructors can see ALL courses and manage instructor assignments
