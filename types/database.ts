// Database types for courses platform

export interface Student {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
}

export type InstructorRole = 'instructor' | 'admin';

export interface Instructor {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  country?: string;
  description?: string;
  picture_url?: string;
  linkedin_url?: string;
  website_url?: string;
  x_url?: string;
  youtube_url?: string;
  role: InstructorRole;
  is_active: boolean;
  email_verified: boolean;
  preferred_language: 'en' | 'es';
  created_at: string;
  updated_at: string;
  last_login_at?: string;
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
  student_id?: string;
  course_id: string;
  signup_status: string;
  language: 'en' | 'es';
  created_at: string;
  updated_at: string;
  completed_at?: string;
  certificate_id?: string;
  certificate_url?: string;
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
