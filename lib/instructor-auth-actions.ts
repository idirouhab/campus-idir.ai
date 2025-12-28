'use server';

import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { Instructor } from '@/types/database';
import { generateAccessToken } from './jwt';
import { setAuthCookie, removeAuthCookie } from './cookies';
import { validatePassword } from './passwordValidation';

const SALT_ROUNDS = 10;

interface InstructorAuthResponse {
  success: boolean;
  data?: Instructor;
  error?: string;
  validationErrors?: string[];
}

export async function instructorSignUpAction(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  dateOfBirth: string,
  country: string
): Promise<InstructorAuthResponse> {
  try {
    const sql = getDb();

    // Validate input
    if (!email || !password || !firstName || !lastName || !dateOfBirth || !country) {
      return { success: false, error: 'All fields are required' };
    }

    // Server-side password validation
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return {
        success: false,
        error: 'Password does not meet requirements',
        validationErrors: passwordValidation.errors,
      };
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Check if instructor already exists
    const existingInstructor = await sql`
      SELECT id FROM instructors WHERE email = ${normalizedEmail}
    `;

    if (existingInstructor.length > 0) {
      return { success: false, error: 'This email is already registered' };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Log the date of birth for debugging
    console.log('[INSTRUCTOR_SIGNUP] Date of birth received:', dateOfBirth);

    // Create new instructor
    const result = await sql`
      INSERT INTO instructors (
        email,
        password_hash,
        first_name,
        last_name,
        date_of_birth,
        country,
        email_verified,
        is_active
      )
      VALUES (
        ${normalizedEmail},
        ${passwordHash},
        ${firstName},
        ${lastName},
        ${dateOfBirth}::date,
        ${country.toUpperCase()},
        false,
        true
      )
      RETURNING id, email, first_name, last_name, date_of_birth, country, description, picture_url,
                linkedin_url, website_url, x_url, youtube_url,
                is_active, email_verified, preferred_language, role, created_at, updated_at, last_login_at
    `;

    if (result.length === 0) {
      console.error('Instructor signup error: No rows returned');
      return { success: false, error: 'Failed to create account' };
    }

    console.log('[INSTRUCTOR_SIGNUP] Date of birth stored:', result[0].date_of_birth);

    const newInstructor: Instructor = {
      id: result[0].id,
      email: result[0].email,
      first_name: result[0].first_name,
      last_name: result[0].last_name,
      date_of_birth: result[0].date_of_birth,
      country: result[0].country,
      description: result[0].description,
      picture_url: result[0].picture_url,
      linkedin_url: result[0].linkedin_url,
      website_url: result[0].website_url,
      x_url: result[0].x_url,
      youtube_url: result[0].youtube_url,
      is_active: result[0].is_active,
      email_verified: result[0].email_verified,
      preferred_language: result[0].preferred_language,
      role: result[0].role,
      created_at: result[0].created_at,
      updated_at: result[0].updated_at,
      last_login_at: result[0].last_login_at,
    };

    return { success: true, data: newInstructor };
  } catch (error: any) {
    console.error('Instructor signup error:', error);
    return { success: false, error: error.message || 'Signup failed' };
  }
}

export async function instructorSignInAction(
  email: string,
  password: string
): Promise<InstructorAuthResponse> {
  try {
    const sql = getDb();

    // Validate input
    if (!email || !password) {
      return { success: false, error: 'Email and password are required' };
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Get instructor with password hash
    const result = await sql`
      SELECT id, email, first_name, last_name, date_of_birth, country, description, picture_url,
             linkedin_url, website_url, x_url, youtube_url,
             is_active, email_verified, preferred_language, role, created_at, updated_at, last_login_at, password_hash
      FROM instructors
      WHERE email = ${normalizedEmail}
    `;

    if (result.length === 0) {
      // Sanitized error - don't reveal if user exists
      return { success: false, error: 'Invalid credentials' };
    }

    const instructor = result[0];

    if (!instructor.password_hash) {
      // Sanitized error
      return { success: false, error: 'Invalid credentials' };
    }

    // Check if instructor is active
    if (!instructor.is_active) {
      // Sanitized error - don't reveal account status
      return { success: false, error: 'Invalid credentials' };
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, instructor.password_hash);

    if (!isPasswordValid) {
      // Sanitized error - same message as above
      return { success: false, error: 'Invalid credentials' };
    }

    // Generate JWT token with role
    const token = await generateAccessToken(
      instructor.id,
      'instructor',
      instructor.email,
      instructor.role
    );

    // Set secure httpOnly cookie
    await setAuthCookie(token);

    // Update last login
    await sql`
      UPDATE instructors
      SET last_login_at = NOW(), updated_at = NOW()
      WHERE id = ${instructor.id}
    `;

    // Return instructor data without password hash
    const instructorData: Instructor = {
      id: instructor.id,
      email: instructor.email,
      first_name: instructor.first_name,
      last_name: instructor.last_name,
      date_of_birth: instructor.date_of_birth,
      country: instructor.country,
      description: instructor.description,
      picture_url: instructor.picture_url,
      linkedin_url: instructor.linkedin_url,
      website_url: instructor.website_url,
      x_url: instructor.x_url,
      youtube_url: instructor.youtube_url,
      is_active: instructor.is_active,
      email_verified: instructor.email_verified,
      preferred_language: instructor.preferred_language,
      role: instructor.role,
      created_at: instructor.created_at,
      updated_at: instructor.updated_at,
      last_login_at: instructor.last_login_at,
    };

    return { success: true, data: instructorData };
  } catch (error: any) {
    console.error('[INSTRUCTOR_AUTH] Sign in error:', error);
    // Sanitized error message
    return { success: false, error: 'Authentication failed' };
  }
}

// Verify instructor exists (for auth check)
export async function verifyInstructorAction(instructorId: string): Promise<InstructorAuthResponse> {
  try {
    const sql = getDb();

    const result = await sql`
      SELECT id, email, first_name, last_name, date_of_birth, country, description, picture_url,
             linkedin_url, website_url, x_url, youtube_url,
             is_active, email_verified, preferred_language, role, created_at, updated_at, last_login_at
      FROM instructors
      WHERE id = ${instructorId}
    `;

    if (result.length === 0) {
      return { success: false, error: 'Instructor not found' };
    }

    if (!result[0].is_active) {
      return { success: false, error: 'Instructor account is inactive' };
    }

    const instructorData: Instructor = {
      id: result[0].id,
      email: result[0].email,
      first_name: result[0].first_name,
      last_name: result[0].last_name,
      date_of_birth: result[0].date_of_birth,
      country: result[0].country,
      description: result[0].description,
      picture_url: result[0].picture_url,
      linkedin_url: result[0].linkedin_url,
      website_url: result[0].website_url,
      x_url: result[0].x_url,
      youtube_url: result[0].youtube_url,
      is_active: result[0].is_active,
      email_verified: result[0].email_verified,
      preferred_language: result[0].preferred_language,
      role: result[0].role,
      created_at: result[0].created_at,
      updated_at: result[0].updated_at,
      last_login_at: result[0].last_login_at,
    };

    return { success: true, data: instructorData };
  } catch (error: any) {
    console.error('[INSTRUCTOR_AUTH] Verify instructor error:', error);
    return { success: false, error: error.message || 'Failed to verify instructor' };
  }
}

// Update instructor profile
export async function updateInstructorProfileAction(
  instructorId: string,
  firstName: string,
  lastName: string,
  email: string,
  dateOfBirth: string,
  country: string,
  description?: string,
  preferredLanguage?: 'en' | 'es',
  linkedinUrl?: string,
  websiteUrl?: string,
  xUrl?: string,
  youtubeUrl?: string
): Promise<InstructorAuthResponse> {
  try {
    const sql = getDb();

    // Validate input
    if (!firstName || !lastName || !email || !dateOfBirth || !country) {
      return { success: false, error: 'Required fields are missing' };
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Check if email is taken by another instructor
    const existingInstructor = await sql`
      SELECT id FROM instructors WHERE email = ${normalizedEmail} AND id != ${instructorId}
    `;

    if (existingInstructor.length > 0) {
      return { success: false, error: 'This email is already in use' };
    }

    // Log the date of birth for debugging
    console.log('[INSTRUCTOR_UPDATE] Date of birth received:', dateOfBirth);

    // Update instructor profile
    const result = await sql`
      UPDATE instructors
      SET first_name = ${firstName},
          last_name = ${lastName},
          email = ${normalizedEmail},
          date_of_birth = ${dateOfBirth}::date,
          country = ${country.toUpperCase()},
          description = ${description || null},
          preferred_language = ${preferredLanguage || 'en'},
          linkedin_url = ${linkedinUrl || null},
          website_url = ${websiteUrl || null},
          x_url = ${xUrl || null},
          youtube_url = ${youtubeUrl || null},
          updated_at = NOW()
      WHERE id = ${instructorId}
      RETURNING id, email, first_name, last_name, date_of_birth, country, description, picture_url,
                linkedin_url, website_url, x_url, youtube_url,
                is_active, email_verified, preferred_language, role, created_at, updated_at, last_login_at
    `;

    if (result.length === 0) {
      return { success: false, error: 'Failed to update profile' };
    }

    console.log('[INSTRUCTOR_UPDATE] Date of birth updated:', result[0].date_of_birth);

    const updatedInstructor: Instructor = {
      id: result[0].id,
      email: result[0].email,
      first_name: result[0].first_name,
      last_name: result[0].last_name,
      date_of_birth: result[0].date_of_birth,
      country: result[0].country,
      description: result[0].description,
      picture_url: result[0].picture_url,
      linkedin_url: result[0].linkedin_url,
      website_url: result[0].website_url,
      x_url: result[0].x_url,
      youtube_url: result[0].youtube_url,
      is_active: result[0].is_active,
      email_verified: result[0].email_verified,
      preferred_language: result[0].preferred_language,
      role: result[0].role,
      created_at: result[0].created_at,
      updated_at: result[0].updated_at,
      last_login_at: result[0].last_login_at,
    };

    return { success: true, data: updatedInstructor };
  } catch (error: any) {
    console.error('[INSTRUCTOR_AUTH] Update profile error:', error);
    return { success: false, error: error.message || 'Failed to update profile' };
  }
}

// Update instructor password
export async function updateInstructorPasswordAction(
  instructorId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const sql = getDb();

    // Validate input
    if (!currentPassword || !newPassword) {
      return { success: false, error: 'All fields are required' };
    }

    // Server-side password validation for new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return {
        success: false,
        error: 'New password does not meet requirements',
      };
    }

    // Get instructor with password hash
    const result = await sql`
      SELECT password_hash
      FROM instructors
      WHERE id = ${instructorId}
    `;

    if (result.length === 0) {
      return { success: false, error: 'Instructor not found' };
    }

    const instructor = result[0];

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, instructor.password_hash);
    if (!isPasswordValid) {
      return { success: false, error: 'Current password is incorrect' };
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update password
    await sql`
      UPDATE instructors
      SET password_hash = ${newPasswordHash},
          updated_at = NOW()
      WHERE id = ${instructorId}
    `;

    return { success: true };
  } catch (error: any) {
    console.error('[INSTRUCTOR_AUTH] Update password error:', error);
    return { success: false, error: 'Failed to update password' };
  }
}

// Sign out action
export async function instructorSignOutAction(): Promise<{ success: boolean }> {
  try {
    await removeAuthCookie();
    return { success: true };
  } catch (error) {
    console.error('[INSTRUCTOR_AUTH] Sign out error:', error);
    return { success: false };
  }
}
