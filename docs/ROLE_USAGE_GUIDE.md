# Role and Permission System - Usage Guide

This guide shows you how to use the flexible, configurable role system in your code.

## Overview

The role system is **permission-based**, which means you check for specific permissions rather than hardcoding role names. This makes it easy to add new roles without changing code everywhere.

## Quick Start

### In React Components

```tsx
import { useInstructorPermissions } from '@/hooks/useInstructorPermissions';

function CourseDashboard({ instructor }) {
  const permissions = useInstructorPermissions(instructor);

  return (
    <div>
      {/* Show "All Courses" link only if user can view all courses */}
      {permissions.canViewAllCourses() && (
        <Link href="/admin/courses">All Courses</Link>
      )}

      {/* Show create button only if user has permission */}
      {permissions.has('courses.create') && (
        <CreateCourseButton />
      )}

      {/* Show admin panel if user has admin access */}
      {permissions.isAdmin() && (
        <AdminPanel />
      )}
    </div>
  );
}
```

### Using Permission Gates

```tsx
import { PermissionGate } from '@/hooks/useInstructorPermissions';

function Dashboard({ instructor }) {
  return (
    <div>
      <h1>Dashboard</h1>

      {/* Only show if user has permission */}
      <PermissionGate instructor={instructor} permission="courses.create">
        <CreateCourseButton />
      </PermissionGate>

      {/* Show if user has ANY of these permissions */}
      <PermissionGate
        instructor={instructor}
        anyPermission={['courses.edit.all', 'courses.delete.all']}
      >
        <AdminActions />
      </PermissionGate>

      {/* Show if user has ALL of these permissions */}
      <PermissionGate
        instructor={instructor}
        allPermissions={['instructors.assign', 'instructors.remove']}
      >
        <InstructorManagement />
      </PermissionGate>

      {/* With fallback content */}
      <PermissionGate
        instructor={instructor}
        permission="analytics.view.all"
        fallback={<p>You don't have access to analytics</p>}
      >
        <Analytics />
      </PermissionGate>
    </div>
  );
}
```

### In Server Actions / API Routes

```typescript
import { canViewAllEnrollments, canAssignInstructors } from '@/lib/roles';

export async function getEnrollments(instructorId: string) {
  // Get instructor from database
  const instructor = await getInstructor(instructorId);

  // Check permission
  if (!canViewAllEnrollments(instructor)) {
    return { error: 'Unauthorized' };
  }

  // Proceed with action
  const enrollments = await sql`SELECT * FROM course_signups`;
  return { enrollments };
}

export async function assignInstructorToCourse(
  adminId: string,
  courseId: string,
  instructorId: string
) {
  const admin = await getInstructor(adminId);

  if (!canAssignInstructors(admin)) {
    return { error: 'Only admins can assign instructors' };
  }

  await sql`
    INSERT INTO course_instructors (course_id, instructor_id)
    VALUES (${courseId}, ${instructorId})
  `;

  return { success: true };
}
```

### Creating a Permission Checker

For repeated checks with the same instructor, create a permission checker once:

```typescript
import { createPermissionChecker } from '@/lib/roles';

function processInstructorData(instructor: Instructor) {
  const permissions = createPermissionChecker(instructor);

  // Use the checker multiple times
  if (permissions.canViewAllCourses()) {
    console.log('Fetching all courses...');
  }

  if (permissions.canViewAllStudents()) {
    console.log('Fetching all students...');
  }

  if (permissions.isAdmin()) {
    console.log('Loading admin dashboard...');
  }
}
```

## Available Permissions

### Course Permissions
- `courses.view.own` - View courses assigned to them
- `courses.view.all` - View all courses
- `courses.create` - Create new courses
- `courses.edit.own` - Edit their courses
- `courses.edit.all` - Edit any course
- `courses.delete.own` - Delete their courses
- `courses.delete.all` - Delete any course

### Enrollment Permissions
- `enrollments.view.own` - View enrollments for their courses
- `enrollments.view.all` - View all enrollments
- `enrollments.manage` - Create/delete enrollments

### Instructor Management
- `instructors.view.all` - View all instructors
- `instructors.assign` - Assign instructors to courses
- `instructors.remove` - Remove instructors from courses
- `instructors.manage` - Full instructor management

### Student Management
- `students.view.own` - View students in their courses
- `students.view.all` - View all students
- `students.manage` - Full student management

### Analytics
- `analytics.view.own` - View analytics for their courses
- `analytics.view.all` - View system-wide analytics

### System
- `system.settings` - Access system settings
- `system.logs` - View system logs

## Helper Functions

Convenient helper functions for common checks:

```typescript
import {
  canViewAllCourses,
  canCreateCourses,
  canEditAnyCourse,
  canDeleteAnyCourse,
  canViewAllEnrollments,
  canManageEnrollments,
  canViewAllInstructors,
  canAssignInstructors,
  canManageInstructors,
  canViewAllStudents,
  canManageStudents,
  canViewAllAnalytics,
  isAdmin,
  hasAdminAccess,
} from '@/lib/roles';

// Usage
if (canViewAllCourses(instructor)) {
  // Show all courses
}

if (isAdmin(instructor)) {
  // Show admin features
}
```

## Adding New Roles

When you need to add a new role:

### 1. Update Database Constraint

```sql
-- Drop old constraint
ALTER TABLE instructors DROP CONSTRAINT valid_instructor_role;

-- Add new constraint with additional role
ALTER TABLE instructors
ADD CONSTRAINT valid_instructor_role
CHECK (role IN ('instructor', 'admin', 'coordinator', 'super_admin'));
```

### 2. Update TypeScript Type

`types/database.ts`:
```typescript
export type InstructorRole =
  | 'instructor'
  | 'admin'
  | 'coordinator'
  | 'super_admin';
```

### 3. Add Role Configuration

`lib/roles/config.ts`:
```typescript
export const ROLES: Record<InstructorRole, {
  name: string;
  description: string;
  permissions: Permission[];
}> = {
  // ... existing roles

  coordinator: {
    name: 'Program Coordinator',
    description: 'Manages courses within their program',
    permissions: [
      'courses.view.all',
      'courses.create',
      'courses.edit.all',
      'enrollments.view.all',
      'instructors.view.all',
      'instructors.assign',
      'students.view.all',
      'analytics.view.all',
    ],
  },
};
```

### 4. That's It!

No need to update any component code. All your permission checks will automatically work with the new role.

## Best Practices

### ✅ DO: Check Permissions

```typescript
// Good - checks permission
if (permissions.has('courses.create')) {
  // Show create button
}
```

### ❌ DON'T: Check Role Directly

```typescript
// Bad - hardcodes role check
if (instructor.role === 'admin') {
  // This breaks when you add new admin-like roles
}
```

### ✅ DO: Use Semantic Helpers

```typescript
// Good - semantic and clear
if (permissions.canViewAllCourses()) {
  fetchAllCourses();
}
```

### ✅ DO: Check on Server Side

```typescript
// Always verify permissions on the server
export async function deleteCourse(instructorId: string, courseId: string) {
  const instructor = await getInstructor(instructorId);

  if (!canDeleteAnyCourse(instructor)) {
    return { error: 'Unauthorized' };
  }

  // Proceed with deletion
}
```

### ✅ DO: Use Permission Gates for UI

```tsx
// Clean and declarative
<PermissionGate instructor={instructor} permission="courses.create">
  <CreateButton />
</PermissionGate>
```

## Examples by Feature

### Admin Dashboard

```tsx
function AdminDashboard({ instructor }) {
  const permissions = useInstructorPermissions(instructor);

  if (!permissions.hasAdminAccess()) {
    return <div>Access Denied</div>;
  }

  return (
    <div>
      {permissions.canViewAllCourses() && <AllCoursesWidget />}
      {permissions.canViewAllEnrollments() && <EnrollmentsWidget />}
      {permissions.canViewAllStudents() && <StudentsWidget />}
      {permissions.canAssignInstructors() && <InstructorManagement />}
      {permissions.canViewAllAnalytics() && <AnalyticsDashboard />}
    </div>
  );
}
```

### Course Management

```tsx
function CourseList({ instructor, courses }) {
  const permissions = useInstructorPermissions(instructor);

  // Fetch courses based on permission
  const displayCourses = permissions.canViewAllCourses()
    ? courses
    : courses.filter(c => c.instructor_id === instructor.id);

  return (
    <div>
      {permissions.has('courses.create') && <CreateCourseButton />}

      {displayCourses.map(course => (
        <CourseCard
          key={course.id}
          course={course}
          canEdit={permissions.has('courses.edit.all')}
          canDelete={permissions.has('courses.delete.all')}
        />
      ))}
    </div>
  );
}
```

### Navigation Menu

```tsx
function NavigationMenu({ instructor }) {
  const permissions = useInstructorPermissions(instructor);

  return (
    <nav>
      <Link href="/instructor/dashboard">Dashboard</Link>
      <Link href="/instructor/courses">My Courses</Link>

      {permissions.canViewAllCourses() && (
        <Link href="/admin/all-courses">All Courses</Link>
      )}

      {permissions.canViewAllEnrollments() && (
        <Link href="/admin/enrollments">Enrollments</Link>
      )}

      {permissions.canAssignInstructors() && (
        <Link href="/admin/instructors">Manage Instructors</Link>
      )}

      {permissions.canViewAllAnalytics() && (
        <Link href="/admin/analytics">Analytics</Link>
      )}
    </nav>
  );
}
```

## Testing

When testing components with permissions:

```typescript
import { ROLES } from '@/lib/roles/config';

// Create test instructors with specific roles
const adminInstructor: Instructor = {
  id: '1',
  role: 'admin',
  // ... other fields
};

const regularInstructor: Instructor = {
  id: '2',
  role: 'instructor',
  // ... other fields
};

// Test with different roles
it('shows admin features for admins', () => {
  render(<Dashboard instructor={adminInstructor} />);
  expect(screen.getByText('Manage Instructors')).toBeInTheDocument();
});

it('hides admin features for regular instructors', () => {
  render(<Dashboard instructor={regularInstructor} />);
  expect(screen.queryByText('Manage Instructors')).not.toBeInTheDocument();
});
```

## Summary

- ✅ Use **permissions**, not role names
- ✅ Use hooks and helpers provided
- ✅ Always check permissions on server-side
- ✅ Adding new roles doesn't require code changes
- ✅ Permission system is flexible and maintainable
