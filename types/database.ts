// Database types for courses platform

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  country?: string;
  birthday?: string;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
}

// Student profile (separate table)
export interface StudentProfile {
  user_id: string;
  preferred_language: 'en' | 'es';
  created_at: string;
  updated_at: string;
}

// Instructor roles
export type InstructorRole = 'instructor' | 'admin';

// Instructor profile (separate table)
export interface InstructorProfile {
  user_id: string;
  title?: string;
  description?: string;
  picture_url?: string;
  linkedin_url?: string;
  x_url?: string;
  youtube_url?: string;
  website_url?: string;
  role: InstructorRole;
  preferred_language: 'en' | 'es';
  created_at: string;
  updated_at: string;
}

// Combined types for convenience
export interface Student extends User {
  profile?: StudentProfile;
}

export interface Instructor extends User {
  profile?: InstructorProfile;
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  short_description?: string;
  course_data?: any;
  cover_image?: string;
  meta_title?: string;
  meta_description?: string;
  language: 'en' | 'es';
  status: 'draft' | 'published';
  published_at?: string;
  enrollment_count: number;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface CourseSignup {
  id: string;
  full_name: string;
  email: string;
  course_slug: string;
  student_id?: string; // References users.id (nullable)
  signup_status: 'pending' | 'confirmed' | 'enrolled';
  language: 'en' | 'es';
  enrolled_at?: string;
  completed_at?: string;
  last_accessed_at?: string;
  progress_percentage: number; // 0-100
  created_at: string;
  updated_at: string;
}

export interface StudentCourseAccess {
  course: Course;
  signup: CourseSignup;
}

export type CourseInstructorRole = 'instructor' | 'lead_instructor' | 'teaching_assistant' | 'guest_instructor';

export interface CourseInstructor {
  id: string;
  course_id: string;
  instructor_id: string;
  display_order: number;
  instructor_role: CourseInstructorRole;
  created_at: string;
  updated_at: string;
}
