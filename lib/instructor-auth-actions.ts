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

    // Check if user already exists
    const existingUser = await sql`
      SELECT id FROM users WHERE email = ${normalizedEmail}
    `;

    if (existingUser.length > 0) {
      return { success: false, error: 'This email is already registered' };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create new user with type='instructor'
    const result = await sql`
      INSERT INTO users (
        email,
        password_hash,
        first_name,
        last_name,
        country,
        type,
        is_active,
        email_verified
      )
      VALUES (
        ${normalizedEmail},
        ${passwordHash},
        ${firstName},
        ${lastName},
        ${country.toUpperCase()},
        'instructor',
        true,
        false
      )
      RETURNING id, email, first_name, last_name, country, type, is_active, email_verified, created_at, updated_at, last_login_at
    `;

    if (result.length === 0) {
      console.error('Instructor signup error: No rows returned');
      return { success: false, error: 'Failed to create account' };
    }

    const userId = result[0].id;

    // Create instructor profile with default role, preferred_language, and birth_date
    await sql`
      INSERT INTO instructor_profiles (user_id, role, preferred_language, birth_date)
      VALUES (${userId}, 'instructor', 'en', ${dateOfBirth})
    `;

    const newInstructor: Instructor = {
      id: result[0].id,
      email: result[0].email,
      first_name: result[0].first_name,
      last_name: result[0].last_name,
      country: result[0].country,
      type: 'instructor',
      is_active: result[0].is_active,
      email_verified: result[0].email_verified,
      created_at: result[0].created_at,
      updated_at: result[0].updated_at,
      last_login_at: result[0].last_login_at,
      profile: {
        user_id: userId,
        role: 'instructor',
        preferred_language: 'en',
        created_at: result[0].created_at,
        updated_at: result[0].updated_at,
        birth_date: dateOfBirth,
      },
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

    // Get user with type='instructor' and join with profile to get role
    const result = await sql`
      SELECT u.id, u.email, u.first_name, u.last_name, u.country, u.type, u.is_active, u.email_verified,
             u.created_at, u.updated_at, u.last_login_at, u.password_hash,
             ip.user_id as profile_user_id, ip.title, ip.description, ip.picture_url,
             ip.linkedin_url, ip.x_url, ip.youtube_url, ip.website_url, ip.role, ip.preferred_language,
             ip.created_at as profile_created_at, ip.updated_at as profile_updated_at, ip.birth_date as profile_birth_date
      FROM users u
      LEFT JOIN instructor_profiles ip ON ip.user_id = u.id
      WHERE u.email = ${normalizedEmail} AND u.type = 'instructor'
    `;

    if (result.length === 0) {
      // Sanitized error - don't reveal if user exists
      return { success: false, error: 'Invalid credentials' };
    }

    const user = result[0];

    if (!user.password_hash) {
      // Sanitized error
      return { success: false, error: 'Invalid credentials' };
    }

    // Check if instructor is active
    if (!user.is_active) {
      // Sanitized error - don't reveal account status
      return { success: false, error: 'Invalid credentials' };
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      // Sanitized error - same message as above
      return { success: false, error: 'Invalid credentials' };
    }

    // Generate JWT token with role
    const token = await generateAccessToken(
      user.id,
      'instructor',
      user.email,
      user.role || 'instructor'
    );

    // Set secure httpOnly cookie
    await setAuthCookie(token);

    // Update last login
    await sql`
      UPDATE users
      SET last_login_at = NOW(), updated_at = NOW()
      WHERE id = ${user.id}
    `;

    // Return instructor data without password hash
    const instructorData: Instructor = {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      country: user.country,
      type: 'instructor',
      is_active: user.is_active,
      email_verified: user.email_verified,
      created_at: user.created_at,
      updated_at: user.updated_at,
      last_login_at: user.last_login_at,
      profile: user.profile_user_id ? {
        user_id: user.profile_user_id,
        title: user.title,
        description: user.description,
        picture_url: user.picture_url,
        linkedin_url: user.linkedin_url,
        x_url: user.x_url,
        youtube_url: user.youtube_url,
        website_url: user.website_url,
        role: user.role || 'instructor',
        preferred_language: user.preferred_language || 'en',
        created_at: user.profile_created_at,
        updated_at: user.profile_updated_at,
        birth_date: user.profile_birth_date,
      } : undefined,
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
      SELECT u.id, u.email, u.first_name, u.last_name, u.country, u.type, u.is_active, u.email_verified,
             u.created_at, u.updated_at, u.last_login_at,
             ip.user_id as profile_user_id, ip.title, ip.description, ip.picture_url,
             ip.linkedin_url, ip.x_url, ip.youtube_url, ip.website_url, ip.role, ip.preferred_language,
             ip.created_at as profile_created_at, ip.updated_at as profile_updated_at, ip.birth_date as profile_birth_date
      FROM users u
      LEFT JOIN instructor_profiles ip ON ip.user_id = u.id
      WHERE u.id = ${instructorId} AND u.type = 'instructor'
    `;

    if (result.length === 0) {
      return { success: false, error: 'Instructor not found' };
    }

    const user = result[0];

    if (!user.is_active) {
      return { success: false, error: 'Instructor account is inactive' };
    }

    const instructorData: Instructor = {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      country: user.country,
      type: 'instructor',
      is_active: user.is_active,
      email_verified: user.email_verified,
      created_at: user.created_at,
      updated_at: user.updated_at,
      last_login_at: user.last_login_at,
      profile: user.profile_user_id ? {
        user_id: user.profile_user_id,
        title: user.title,
        description: user.description,
        picture_url: user.picture_url,
        linkedin_url: user.linkedin_url,
        x_url: user.x_url,
        youtube_url: user.youtube_url,
        website_url: user.website_url,
        role: user.role || 'instructor',
        preferred_language: user.preferred_language || 'en',
        created_at: user.profile_created_at,
        updated_at: user.profile_updated_at,
        birth_date: user.profile_birth_date,
      } : undefined,
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

    // Check if email is taken by another user
    const existingUser = await sql`
      SELECT id FROM users WHERE email = ${normalizedEmail} AND id != ${instructorId}
    `;

    if (existingUser.length > 0) {
      return { success: false, error: 'This email is already in use' };
    }

    // Update user table (basic fields)
    const userResult = await sql`
      UPDATE users
      SET first_name = ${firstName},
          last_name = ${lastName},
          email = ${normalizedEmail},
          country = ${country.toUpperCase()},
          updated_at = NOW()
      WHERE id = ${instructorId} AND type = 'instructor'
      RETURNING id, email, first_name, last_name, country, type, is_active, email_verified, created_at, updated_at, last_login_at
    `;

    if (userResult.length === 0) {
      return { success: false, error: 'Failed to update profile' };
    }

    // Update instructor profile table (profile-specific fields)
    await sql`
      UPDATE instructor_profiles
      SET description = ${description || null},
          preferred_language = ${preferredLanguage || 'en'},
          linkedin_url = ${linkedinUrl || null},
          website_url = ${websiteUrl || null},
          x_url = ${xUrl || null},
          youtube_url = ${youtubeUrl || null},
          birth_date = ${dateOfBirth},
          updated_at = NOW()
      WHERE user_id = ${instructorId}
    `;

    // Fetch updated instructor with profile
    const result = await sql`
      SELECT u.id, u.email, u.first_name, u.last_name, u.country, u.type, u.is_active, u.email_verified,
             u.created_at, u.updated_at, u.last_login_at,
             ip.user_id as profile_user_id, ip.title, ip.description, ip.picture_url,
             ip.linkedin_url, ip.x_url, ip.youtube_url, ip.website_url, ip.role, ip.preferred_language,
             ip.created_at as profile_created_at, ip.updated_at as profile_updated_at, ip.birth_date as profile_birth_date
      FROM users u
      LEFT JOIN instructor_profiles ip ON ip.user_id = u.id
      WHERE u.id = ${instructorId} AND u.type = 'instructor'
    `;

    const user = result[0];

    const updatedInstructor: Instructor = {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      country: user.country,
      type: 'instructor',
      is_active: user.is_active,
      email_verified: user.email_verified,
      created_at: user.created_at,
      updated_at: user.updated_at,
      last_login_at: user.last_login_at,
      profile: user.profile_user_id ? {
        user_id: user.profile_user_id,
        title: user.title,
        description: user.description,
        picture_url: user.picture_url,
        linkedin_url: user.linkedin_url,
        x_url: user.x_url,
        youtube_url: user.youtube_url,
        website_url: user.website_url,
        role: user.role || 'instructor',
        preferred_language: user.preferred_language || 'en',
        created_at: user.profile_created_at,
        updated_at: user.profile_updated_at,
        birth_date: user.profile_birth_date,
      } : undefined,
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

    // Get user with password hash
    const result = await sql`
      SELECT password_hash
      FROM users
      WHERE id = ${instructorId} AND type = 'instructor'
    `;

    if (result.length === 0) {
      return { success: false, error: 'Instructor not found' };
    }

    const user = result[0];

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isPasswordValid) {
      return { success: false, error: 'Current password is incorrect' };
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update password
    await sql`
      UPDATE users
      SET password_hash = ${newPasswordHash},
          updated_at = NOW()
      WHERE id = ${instructorId} AND type = 'instructor'
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
