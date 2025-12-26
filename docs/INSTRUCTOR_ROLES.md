# Instructor Role System

This document explains the role-based access system for instructors in the platform.

## Overview

The platform supports two levels of instructor roles:

1. **Account-level roles** (in `instructors` table)
2. **Course-level roles** (in `course_instructors` table)

## Account-Level Roles

Defined in the `instructors.role` field:

### `instructor` (Default)
- Regular instructor with standard permissions
- Can manage courses they are assigned to
- Can view students enrolled in their courses
- Cannot assign other instructors to courses

### `admin`
- Full administrative access
- Can view all courses and enrollments
- Can assign instructors to any course
- Can manage the `course_instructors` junction table
- Access to system-wide analytics and reports

## Course-Level Roles

Defined in the `course_instructors.instructor_role` field (allows multiple instructors per course):

### `lead_instructor`
- Primary instructor for the course
- Appears first in instructor listings

### `instructor`
- Standard teaching role for the course

### `teaching_assistant`
- Supporting role, assists with course delivery

### `guest_instructor`
- External or temporary instructor

## Database Structure

### Instructors Table
```sql
ALTER TABLE instructors
ADD COLUMN role VARCHAR(50) DEFAULT 'instructor' NOT NULL;

ADD CONSTRAINT valid_instructor_role CHECK (role IN ('instructor', 'admin'));
```

### Course Instructors Table (Junction)
```sql
CREATE TABLE course_instructors (
  id UUID PRIMARY KEY,
  course_id UUID REFERENCES courses(id),
  instructor_id UUID REFERENCES instructors(id),
  display_order INTEGER DEFAULT 0,
  instructor_role VARCHAR(50) DEFAULT 'instructor',
  CONSTRAINT valid_instructor_role CHECK (
    instructor_role IN ('instructor', 'lead_instructor', 'teaching_assistant', 'guest_instructor')
  )
);
```

## TypeScript Types

```typescript
// Account-level role
export type InstructorRole = 'instructor' | 'admin';

// Course-level role
export type CourseInstructorRole =
  | 'instructor'
  | 'lead_instructor'
  | 'teaching_assistant'
  | 'guest_instructor';

export interface Instructor {
  // ...other fields
  role: InstructorRole;
}

export interface CourseInstructor {
  id: string;
  course_id: string;
  instructor_id: string;
  display_order: number;
  instructor_role: CourseInstructorRole;
  created_at: string;
  updated_at: string;
}
```

## Usage Examples

### Checking if user is admin
```typescript
if (instructor.role === 'admin') {
  // Show admin features
  // Allow course instructor assignments
  // Show all enrollments
}
```

### Getting instructors for a course
```typescript
const courseInstructors = await sql`
  SELECT
    i.*,
    ci.display_order,
    ci.instructor_role
  FROM course_instructors ci
  JOIN instructors i ON i.id = ci.instructor_id
  WHERE ci.course_id = ${courseId}
  ORDER BY ci.display_order ASC
`;
```

### Assigning an instructor to a course (admin only)
```typescript
await sql`
  INSERT INTO course_instructors (
    course_id,
    instructor_id,
    display_order,
    instructor_role
  )
  VALUES (
    ${courseId},
    ${instructorId},
    ${displayOrder},
    ${role}
  )
`;
```

## Extending the Role System

### Adding New Account-Level Roles

1. Drop the existing constraint:
```sql
ALTER TABLE instructors DROP CONSTRAINT valid_instructor_role;
```

2. Add new constraint with additional roles:
```sql
ALTER TABLE instructors
ADD CONSTRAINT valid_instructor_role
CHECK (role IN ('instructor', 'admin', 'super_admin', 'coordinator'));
```

3. Update TypeScript type:
```typescript
export type InstructorRole =
  | 'instructor'
  | 'admin'
  | 'super_admin'
  | 'coordinator';
```

### Adding New Course-Level Roles

Follow the same pattern for the `course_instructors` table.

## Migration

To apply the role field to the instructors table, run:

```bash
# Using psql
psql $DATABASE_URL -f dummy/add_instructor_role.sql

# Or using Supabase CLI
supabase db push

# Or manually through Supabase Studio/pgAdmin
```

## Security Considerations

- Always verify instructor role on the server-side before allowing admin actions
- Use Row Level Security (RLS) policies to restrict data access based on role
- Log role changes and instructor assignments for audit trails
- Consider implementing role-based middleware for protected routes

## Future Enhancements

Potential roles to consider:
- `super_admin`: System-wide administrative access
- `coordinator`: Program or department-level management
- `reviewer`: Can review and approve content
- `guest`: Limited read-only access
