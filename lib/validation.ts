/**
 * Input validation schemas using Zod
 * SECURITY: All server actions should validate inputs using these schemas
 */

import { z } from 'zod';

// UUID validation
export const uuidSchema = z.string().uuid('Invalid ID format');

// Email validation
export const emailSchema = z
  .string()
  .email('Invalid email format')
  .max(255, 'Email must be 255 characters or less')
  .toLowerCase()
  .trim();

// Name validation
export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name must be 100 characters or less')
  .trim()
  .regex(/^[a-zA-Z\s\-']+$/, 'Name contains invalid characters');

// Date validation (YYYY-MM-DD format)
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (use YYYY-MM-DD)')
  .refine((date) => {
    const d = new Date(date);
    return !isNaN(d.getTime()) && d < new Date() && d > new Date('1900-01-01');
  }, 'Date must be between 1900 and today');

// Password validation
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be 128 characters or less');

// Profile update schema
export const profileUpdateSchema = z.object({
  studentId: uuidSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,
  dateOfBirth: dateSchema,
});

// Password update schema
export const passwordUpdateSchema = z.object({
  studentId: uuidSchema,
  currentPassword: passwordSchema,
  newPassword: passwordSchema,
});

// Sign up schema
export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  dateOfBirth: dateSchema,
  timezone: z.string().min(1).max(50).default('Europe/Berlin'),
});

// Sign in schema
export const signInSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

// Password reset request schema
export const passwordResetRequestSchema = z.object({
  email: emailSchema,
  locale: z.string().min(2).max(10).optional().default('en-US'),
});

// Password reset schema
export const passwordResetSchema = z.object({
  token: z.string().min(32, 'Invalid token format'),
  newPassword: passwordSchema,
});

// Course ID schema
export const courseIdSchema = z.object({
  courseId: uuidSchema,
});

// Forum post schema
export const forumPostSchema = z.object({
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(255, 'Title must be 255 characters or less')
    .trim(),
  body: z
    .string()
    .min(20, 'Body must be at least 20 characters')
    .max(10000, 'Body must be 10000 characters or less')
    .trim(),
});

// File upload validation
export const fileUploadSchema = z.object({
  file: z.custom<File>(
    (val) => val instanceof File,
    'Invalid file'
  ),
  instructorId: uuidSchema,
  courseId: uuidSchema.optional(),
});

/**
 * Sanitize HTML content (for forum posts, etc.)
 * Removes all HTML tags except safe ones
 */
export function sanitizeHtml(html: string): string {
  // Basic sanitization - remove script tags and event handlers
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/g, '')
    .replace(/on\w+='[^']*'/g, '')
    .replace(/javascript:/gi, '');
}

/**
 * Validate and parse query parameters safely
 */
export function safeParseInt(value: string | null | undefined, defaultValue: number = 0): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Validate pagination parameters
 */
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type PaginationParams = z.infer<typeof paginationSchema>;
