// Database types for courses platform

// ==========================================
// Course Data Types (Language-Agnostic)
// ==========================================

export type DurationUnit = 'weeks' | 'days' | 'hours';
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday, 6 = Saturday

export interface CourseDuration {
  value: number;
  unit: DurationUnit;
}

export interface CourseLogistics {
  session_duration_hours: number; // Hours per session (e.g., 1.5) - REQUIRED
  tools?: string;
  capacity?: {
    number?: string;
    reason?: string;
    waitlistText?: string;
  };
  duration: CourseDuration; // Structured duration - REQUIRED
  modality?: string;
  schedule: {
    days_of_week: DayOfWeek[]; // Array of day indices (0-6) - REQUIRED
    time_display?: string; // For display purposes
  };
  startDate: string; // ISO 8601 date string (YYYY-MM-DD) - REQUIRED
  scheduleDetail?: string; // Time detail (e.g., "7:00 PM - 8:00 PM CET")
}

export interface CourseFormField {
  name: string;
  type: 'text' | 'email' | 'number' | 'select';
  label_key: string; // Translation key (e.g., 'form.firstName') - REQUIRED
  required?: boolean;
  placeholder?: string;
  options?: string[];
}

export interface CourseForm {
  fields: CourseFormField[];
  enabled: boolean;
  endpoint?: string;
  requiresTerms?: boolean;
  requiresCommitment?: boolean;
}

export interface CourseHero {
  badge?: string;
  title?: string;
  subtitle?: string;
  description?: string;
}

export interface CoursePricing {
  badge?: string;
  amount?: number;
  isFree?: boolean;
  currency?: string;
  discountPrice?: number | null;
}

export interface CourseBenefit {
  icon?: string;
  title?: string;
  description?: string;
}

export interface CourseDonation {
  link?: string;
  text?: string;
  label?: string;
  linkText?: string;
}

export interface CourseData {
  form?: CourseForm;
  hero?: CourseHero;
  pricing?: CoursePricing;
  benefits?: CourseBenefit[];
  donation?: CourseDonation;
  logistics?: CourseLogistics;
  mode?: string; // Legacy field for backwards compatibility
  long_description?: string; // Markdown content
}

// ==========================================
// User Types
// ==========================================

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  country?: string;
  birthday?: string;
  timezone?: string;
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
  course_data?: CourseData;
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
  signup_status: 'pending' | 'confirmed' | 'enrolled' | 'cancelled' | 'expired';
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

export interface CourseSession {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  session_date: string; // ISO 8601 string (UTC)
  duration_minutes: number;
  display_order: number;
  timezone: string; // IANA timezone (e.g., 'America/New_York')
  meeting_url?: string; // Optional video conference link (Google Meet, Zoom, etc.)
  recording_link?: string; // Optional link to recorded session (YouTube, Vimeo, Google Drive, etc.)
  created_at: string;
  updated_at: string;
}

export interface SessionAttendance {
  id: string;
  session_id: string;
  student_id: string;
  signup_id: string;
  attendance_status: 'present' | 'absent';
  marked_by: string; // Instructor user ID
  marked_at: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Extended type for UI with student details
export interface AttendanceRecord extends SessionAttendance {
  student_first_name: string;
  student_last_name: string;
  student_email: string;
}

// Summary type for session attendance statistics
export interface SessionAttendanceSummary {
  session_id: string;
  session_title: string;
  session_date: string;
  total_students: number;
  present_count: number;
  absent_count: number;
  attendance_percentage: number;
}

export interface CourseMaterial {
  id: string;
  course_id: string;
  session_id?: string; // NULL = course-level material, NOT NULL = session-specific material
  uploaded_by: string;
  original_filename: string | null; // Nullable for link resources
  display_filename: string;
  file_url: string;
  file_type: 'pdf' | 'docx' | 'pptx' | 'doc' | 'ppt' | 'link'; // Added 'link' type
  file_size_bytes: number | null; // Nullable for link resources
  mime_type: string | null; // Nullable for link resources
  display_order: number;
  resource_type: 'file' | 'link'; // Distinguishes between uploaded files and external links
  external_link_url: string | null; // Stores original Google Drive URL for link resources
  created_at: string;
  updated_at: string;
}
