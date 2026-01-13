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
  country: string,
  timezone: string = 'Europe/Berlin'
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
      SELECT id, password_hash, country FROM users WHERE email = ${normalizedEmail}
    `;

    let userId: string;
    let passwordHash: string;

    if (existingUser.length > 0) {
      // User exists - check if they already have an instructor profile
      const user = existingUser[0];

      const existingProfile = await sql`
        SELECT user_id FROM instructor_profiles WHERE user_id = ${user.id}
      `;

      if (existingProfile.length > 0) {
        return { success: false, error: 'You already have an instructor account. Please use the instructor login.' };
      }

      // Update user to add country and birthday if they don't have them
      userId = user.id;
      passwordHash = user.password_hash;

      // Update the user's country, birthday, and timezone if not set
      if (!user.country) {
        await sql`
          UPDATE users
          SET country = ${country.toUpperCase()},
              birthday = ${dateOfBirth},
              timezone = ${timezone}
          WHERE id = ${userId}
        `;
      } else {
        await sql`
          UPDATE users
          SET birthday = ${dateOfBirth},
              timezone = ${timezone}
          WHERE id = ${userId}
        `;
      }

      // Create instructor profile (without birthday and timezone as they're now in users table)
      await sql`
        INSERT INTO instructor_profiles (user_id, role, preferred_language)
        VALUES (${userId}, 'instructor', 'en')
      `;
    } else {
      // New user - create account
      passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      // Create new user
      const result = await sql`
        INSERT INTO users (
          email,
          password_hash,
          first_name,
          last_name,
          country,
          birthday,
          timezone,
          is_active,
          email_verified
        )
        VALUES (
          ${normalizedEmail},
          ${passwordHash},
          ${firstName},
          ${lastName},
          ${country.toUpperCase()},
          ${dateOfBirth},
          ${timezone},
          true,
          true
        )
        RETURNING id, email, first_name, last_name, country, timezone, is_active, email_verified, created_at, updated_at, last_login_at
      `;

      if (result.length === 0) {
        console.error('Instructor signup error: No rows returned');
        return { success: false, error: 'Failed to create account' };
      }

      userId = result[0].id;

      // Create instructor profile (without birthday and timezone as they're now in users table)
      await sql`
        INSERT INTO instructor_profiles (user_id, role, preferred_language)
        VALUES (${userId}, 'instructor', 'en')
      `;
    }

    // Fetch the user data to return
    const userData = await sql`
      SELECT id, email, first_name, last_name, country, birthday, timezone, is_active, email_verified, created_at, updated_at, last_login_at
      FROM users
      WHERE id = ${userId}
    `;

    if (userData.length === 0) {
      return { success: false, error: 'Failed to retrieve user data' };
    }

    const newInstructor: Instructor = {
      id: userData[0].id,
      email: userData[0].email,
      first_name: userData[0].first_name,
      last_name: userData[0].last_name,
      country: userData[0].country,
      birthday: userData[0].birthday,
      timezone: userData[0].timezone,
      is_active: userData[0].is_active,
      email_verified: userData[0].email_verified,
      created_at: userData[0].created_at,
      updated_at: userData[0].updated_at,
      last_login_at: userData[0].last_login_at,
      profile: {
        user_id: userId,
        role: 'instructor',
        preferred_language: 'en',
        created_at: userData[0].created_at,
        updated_at: userData[0].updated_at,
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

    // Get user by email and join with instructor profile
    const result = await sql`
      SELECT u.id, u.email, u.first_name, u.last_name, u.country, u.timezone, u.is_active, u.email_verified,
             u.created_at, u.updated_at, u.last_login_at, u.password_hash, u.birthday,
             ip.user_id as profile_user_id, ip.title, ip.description, ip.picture_url,
             ip.linkedin_url, ip.x_url, ip.youtube_url, ip.website_url, ip.role, ip.preferred_language,
             ip.created_at as profile_created_at, ip.updated_at as profile_updated_at
      FROM users u
      LEFT JOIN instructor_profiles ip ON ip.user_id = u.id
      WHERE u.email = ${normalizedEmail}
    `;

    if (result.length === 0) {
      // Sanitized error - don't reveal if user exists
      return { success: false, error: 'Invalid credentials' };
    }

    const user = result[0];

    // Check if user has an instructor profile
    if (!user.profile_user_id) {
      // User exists but doesn't have an instructor profile
      return { success: false, error: 'Invalid credentials' };
    }

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
      birthday: user.birthday,
      timezone: user.timezone,
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
      SELECT u.id, u.email, u.first_name, u.last_name, u.country, u.timezone, u.is_active, u.email_verified,
             u.created_at, u.updated_at, u.last_login_at, u.birthday,
             ip.user_id as profile_user_id, ip.title, ip.description, ip.picture_url,
             ip.linkedin_url, ip.x_url, ip.youtube_url, ip.website_url, ip.role, ip.preferred_language,
             ip.created_at as profile_created_at, ip.updated_at as profile_updated_at
      FROM users u
      LEFT JOIN instructor_profiles ip ON ip.user_id = u.id
      WHERE u.id = ${instructorId}
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
      birthday: user.birthday,
      timezone: user.timezone,
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
  timezone?: string,
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

    // Update user table (basic fields including birthday and timezone)
    const userResult = await sql`
      UPDATE users
      SET first_name = ${firstName},
          last_name = ${lastName},
          email = ${normalizedEmail},
          country = ${country.toUpperCase()},
          birthday = ${dateOfBirth},
          timezone = ${timezone || 'Europe/Berlin'},
          updated_at = NOW()
      WHERE id = ${instructorId}
      RETURNING id, email, first_name, last_name, country, timezone, is_active, email_verified, created_at, updated_at, last_login_at
    `;

    if (userResult.length === 0) {
      return { success: false, error: 'Failed to update profile' };
    }

    // Update instructor profile table (profile-specific fields, without birthday and timezone)
    await sql`
      UPDATE instructor_profiles
      SET description = ${description || null},
          preferred_language = ${preferredLanguage || 'en'},
          linkedin_url = ${linkedinUrl || null},
          website_url = ${websiteUrl || null},
          x_url = ${xUrl || null},
          youtube_url = ${youtubeUrl || null},
          updated_at = NOW()
      WHERE user_id = ${instructorId}
    `;

    // Fetch updated instructor with profile
    const result = await sql`
      SELECT u.id, u.email, u.first_name, u.last_name, u.country, u.timezone, u.is_active, u.email_verified,
             u.created_at, u.updated_at, u.last_login_at, u.birthday,
             ip.user_id as profile_user_id, ip.title, ip.description, ip.picture_url,
             ip.linkedin_url, ip.x_url, ip.youtube_url, ip.website_url, ip.role, ip.preferred_language,
             ip.created_at as profile_created_at, ip.updated_at as profile_updated_at
      FROM users u
      LEFT JOIN instructor_profiles ip ON ip.user_id = u.id
      WHERE u.id = ${instructorId}
    `;

    const user = result[0];

    const updatedInstructor: Instructor = {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      country: user.country,
      birthday: user.birthday,
      timezone: user.timezone,
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

    // Verify user has instructor profile
    const profileCheck = await sql`
      SELECT user_id FROM instructor_profiles WHERE user_id = ${instructorId}
    `;

    if (profileCheck.length === 0) {
      return { success: false, error: 'Instructor not found' };
    }

    // Get user with password hash
    const result = await sql`
      SELECT password_hash
      FROM users
      WHERE id = ${instructorId}
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
