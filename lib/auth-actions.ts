'use server';

import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { Student } from '@/types/database';
import { generateAccessToken } from './jwt';
import { setAuthCookie, removeAuthCookie } from './cookies';
import { validatePassword } from './passwordValidation';

const SALT_ROUNDS = 10;

interface AuthResponse {
  success: boolean;
  data?: Student;
  error?: string;
  validationErrors?: string[];
}

export async function signUpAction(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  dateOfBirth: string,
  timezone: string = 'Europe/Berlin'
): Promise<AuthResponse> {
  try {
    const sql = getDb();

    // SECURITY: Validate all inputs with Zod schema
    const { signUpSchema } = await import('@/lib/validation');
    const validatedData = signUpSchema.parse({
      email,
      password,
      firstName,
      lastName,
      dateOfBirth,
      timezone,
    });

    // SECURITY: Rate limiting - 3 signups per hour per email
    const { authRateLimiter, createEmailRateLimitToken } = await import('@/lib/rate-limit');
    const rateLimitToken = createEmailRateLimitToken(validatedData.email);
    const rateLimitResult = authRateLimiter.check(3, rateLimitToken);

    if (!rateLimitResult.success) {
      return {
        success: false,
        error: 'Too many signup attempts. Please try again later.'
      };
    }

    // Server-side password validation
    const passwordValidation = validatePassword(validatedData.password);
    if (!passwordValidation.isValid) {
      return {
        success: false,
        error: 'Password does not meet requirements',
        validationErrors: passwordValidation.errors,
      };
    }

    // Use validated and normalized email
    const normalizedEmail = validatedData.email;

    // Check if user already exists
    const existingUser = await sql`
      SELECT id, password_hash FROM users WHERE email = ${normalizedEmail}
    `;

    let userId: string;
    let passwordHash: string;

    if (existingUser.length > 0) {
      // User exists - check if they already have a student profile
      const user = existingUser[0];

      const existingProfile = await sql`
        SELECT user_id FROM student_profiles WHERE user_id = ${user.id}
      `;

      if (existingProfile.length > 0) {
        return { success: false, error: 'You already have a student account. Please use the student login.' };
      }

      // Create student profile for existing user
      userId = user.id;
      passwordHash = user.password_hash;

      // Update timezone for existing user
      await sql`
        UPDATE users
        SET timezone = ${validatedData.timezone}
        WHERE id = ${userId}
      `;

      // Create student profile
      await sql`
        INSERT INTO student_profiles (user_id, preferred_language)
        VALUES (${userId}, 'en')
      `;
    } else {
      // New user - create account
      passwordHash = await bcrypt.hash(validatedData.password, SALT_ROUNDS);

      // Create new user
      const result = await sql`
        INSERT INTO users (email, password_hash, first_name, last_name, birthday, timezone, is_active, email_verified)
        VALUES (${normalizedEmail}, ${passwordHash}, ${validatedData.firstName}, ${validatedData.lastName}, ${validatedData.dateOfBirth}, ${validatedData.timezone}, true, false)
        RETURNING id, email, first_name, last_name, timezone, is_active, email_verified, created_at, updated_at, last_login_at
      `;

      if (result.length === 0) {
        console.error('Signup error: No rows returned');
        return { success: false, error: 'Failed to create account' };
      }

      userId = result[0].id;

      // Create student profile with default preferred_language
      await sql`
        INSERT INTO student_profiles (user_id, preferred_language)
        VALUES (${userId}, 'en')
      `;
    }

    // Fetch the user data to return
    const userData = await sql`
      SELECT id, email, first_name, last_name, birthday, timezone, is_active, email_verified, created_at, updated_at, last_login_at
      FROM users
      WHERE id = ${userId}
    `;

    if (userData.length === 0) {
      return { success: false, error: 'Failed to retrieve user data' };
    }

    const newStudent: Student = {
      id: userData[0].id,
      email: userData[0].email,
      first_name: userData[0].first_name,
      last_name: userData[0].last_name,
      birthday: userData[0].birthday,
      timezone: userData[0].timezone,
      is_active: userData[0].is_active,
      email_verified: userData[0].email_verified,
      created_at: userData[0].created_at,
      updated_at: userData[0].updated_at,
      last_login_at: userData[0].last_login_at,
    };

    return { success: true, data: newStudent };
  } catch (error: any) {
    console.error('Signup error:', error);
    return { success: false, error: error.message || 'Signup failed' };
  }
}

export async function signInAction(
  email: string,
  password: string
): Promise<AuthResponse> {
  try {
    const sql = getDb();

    // SECURITY: Validate all inputs with Zod schema
    const { signInSchema } = await import('@/lib/validation');
    const validatedData = signInSchema.parse({ email, password });

    // SECURITY: Rate limiting - 5 attempts per minute per email
    const { authRateLimiter, createEmailRateLimitToken } = await import('@/lib/rate-limit');
    const rateLimitToken = createEmailRateLimitToken(validatedData.email);
    const rateLimitResult = authRateLimiter.check(5, rateLimitToken);

    if (!rateLimitResult.success) {
      return {
        success: false,
        error: 'Too many login attempts. Please try again later.'
      };
    }

    // Use validated and normalized email
    const normalizedEmail = validatedData.email;

    // Get user by email and check if they have a student profile
    const result = await sql`
      SELECT u.id, u.email, u.first_name, u.last_name, u.birthday, u.is_active, u.email_verified,
             u.created_at, u.updated_at, u.last_login_at, u.password_hash,
             sp.user_id as has_student_profile
      FROM users u
      LEFT JOIN student_profiles sp ON sp.user_id = u.id
      WHERE u.email = ${normalizedEmail}
    `;

    if (result.length === 0) {
      // Sanitized error - don't reveal if user exists
      return { success: false, error: 'Invalid credentials' };
    }

    const user = result[0];

    // Check if user has a student profile
    if (!user.has_student_profile) {
      // User exists but doesn't have a student profile
      return { success: false, error: 'Invalid credentials' };
    }

    if (!user.is_active) {
      // Account is inactive
      return { success: false, error: 'Invalid credentials' };
    }

    if (!user.password_hash) {
      // Sanitized error
      return { success: false, error: 'Invalid credentials' };
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(validatedData.password, user.password_hash);

    if (!isPasswordValid) {
      // Sanitized error - same message as above
      return { success: false, error: 'Invalid credentials' };
    }

    // Generate JWT token
    const token = await generateAccessToken(
      user.id,
      'student',
      user.email
    );

    // Set secure httpOnly cookie
    await setAuthCookie(token);

    // Update last login
    await sql`
      UPDATE users
      SET last_login_at = NOW(), updated_at = NOW()
      WHERE id = ${user.id}
    `;

    // Return student data without password hash
    const studentData: Student = {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      birthday: user.birthday,
      is_active: user.is_active,
      email_verified: user.email_verified,
      created_at: user.created_at,
      updated_at: user.updated_at,
      last_login_at: user.last_login_at,
    };

    return { success: true, data: studentData };
  } catch (error: any) {
    console.error('[AUTH] Sign in error:', error);
    // Sanitized error message
    return { success: false, error: 'Authentication failed' };
  }
}

/**
 * Unified sign-in action that supports dual-role users
 * Checks both student and instructor profiles and defaults to instructor view
 */
export async function unifiedSignInAction(
  email: string,
  password: string
): Promise<AuthResponse> {
  try {
    const sql = getDb();

    // SECURITY: Validate all inputs with Zod schema
    const { signInSchema } = await import('@/lib/validation');
    const validatedData = signInSchema.parse({ email, password });

    // SECURITY: Rate limiting - 5 attempts per minute per email
    const { authRateLimiter, createEmailRateLimitToken } = await import('@/lib/rate-limit');
    const rateLimitToken = createEmailRateLimitToken(validatedData.email);
    const rateLimitResult = authRateLimiter.check(5, rateLimitToken);

    if (!rateLimitResult.success) {
      return {
        success: false,
        error: 'Too many login attempts. Please try again later.'
      };
    }

    // Use validated and normalized email
    const normalizedEmail = validatedData.email;

    // Get user and check BOTH student and instructor profiles
    const result = await sql`
      SELECT u.id, u.email, u.first_name, u.last_name, u.birthday, u.is_active, u.email_verified,
             u.created_at, u.updated_at, u.last_login_at, u.password_hash,
             sp.user_id as has_student_profile,
             ip.user_id as has_instructor_profile, ip.role
      FROM users u
      LEFT JOIN student_profiles sp ON sp.user_id = u.id
      LEFT JOIN instructor_profiles ip ON ip.user_id = u.id
      WHERE u.email = ${normalizedEmail}
    `;

    if (result.length === 0) {
      return { success: false, error: 'Invalid credentials' };
    }

    const user = result[0];

    // Check if user has at least one valid profile
    const hasStudentProfile = !!user.has_student_profile;
    const hasInstructorProfile = !!user.has_instructor_profile;

    if (!hasStudentProfile && !hasInstructorProfile) {
      return { success: false, error: 'Invalid credentials' };
    }

    if (!user.is_active) {
      return { success: false, error: 'Invalid credentials' };
    }

    if (!user.password_hash) {
      return { success: false, error: 'Invalid credentials' };
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(validatedData.password, user.password_hash);

    if (!isPasswordValid) {
      return { success: false, error: 'Invalid credentials' };
    }

    // Determine default userType and currentView
    // Priority: Instructor > Student
    let userType: 'student' | 'instructor';
    let currentView: 'student' | 'instructor';
    let role: 'instructor' | 'admin' | undefined;

    if (hasInstructorProfile) {
      userType = 'instructor';
      currentView = 'instructor';
      role = user.role || 'instructor';
    } else {
      userType = 'student';
      currentView = 'student';
    }

    // Generate JWT token with dual-role support
    const token = await generateAccessToken(
      user.id,
      userType,
      user.email,
      role,
      hasStudentProfile,
      hasInstructorProfile,
      currentView
    );

    // Set secure httpOnly cookie
    await setAuthCookie(token);

    // Update last login
    await sql`
      UPDATE users
      SET last_login_at = NOW(), updated_at = NOW()
      WHERE id = ${user.id}
    `;

    // Return user data
    const userData: Student = {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      birthday: user.birthday,
      is_active: user.is_active,
      email_verified: user.email_verified,
      created_at: user.created_at,
      updated_at: user.updated_at,
      last_login_at: user.last_login_at,
    };

    return { success: true, data: userData };
  } catch (error: any) {
    console.error('[AUTH] Unified sign in error:', error);
    return { success: false, error: 'Authentication failed' };
  }
}

// Verify student exists (for auth check)
export async function verifyStudentAction(studentId: string): Promise<AuthResponse> {
  try {
    const sql = getDb();

    // Verify user has student profile
    const profileCheck = await sql`
      SELECT user_id FROM student_profiles WHERE user_id = ${studentId}
    `;

    if (profileCheck.length === 0) {
      return { success: false, error: 'Student not found' };
    }

    const result = await sql`
      SELECT id, email, first_name, last_name, birthday, is_active, email_verified, created_at, updated_at, last_login_at
      FROM users
      WHERE id = ${studentId}
    `;

    if (result.length === 0) {
      return { success: false, error: 'Student not found' };
    }

    const studentData: Student = {
      id: result[0].id,
      email: result[0].email,
      first_name: result[0].first_name,
      last_name: result[0].last_name,
      birthday: result[0].birthday,
      is_active: result[0].is_active,
      email_verified: result[0].email_verified,
      created_at: result[0].created_at,
      updated_at: result[0].updated_at,
      last_login_at: result[0].last_login_at,
    };

    return { success: true, data: studentData };
  } catch (error: any) {
    console.error('[AUTH] Verify student error:', error);
    return { success: false, error: error.message || 'Failed to verify student' };
  }
}

// Update student profile
export async function updateStudentProfileAction(
  studentId: string,
  firstName: string,
  lastName: string,
  email: string,
  dateOfBirth: string
): Promise<AuthResponse> {
  try {
    const sql = getDb();

    // SECURITY: Import validation at top of file
    const { profileUpdateSchema } = await import('@/lib/validation');
    const { requireUserType } = await import('@/lib/session');

    // SECURITY: Get current session and verify authorization
    const session = await requireUserType('student');

    // SECURITY: Authorization check - user can only update their own profile
    if (session.id !== studentId) {
      return { success: false, error: 'Forbidden: You can only update your own profile' };
    }

    // SECURITY: Validate all inputs with Zod schema
    const validatedData = profileUpdateSchema.parse({
      studentId,
      firstName,
      lastName,
      email,
      dateOfBirth,
    });

    // Check if email is taken by another user
    const existingUser = await sql`
      SELECT id FROM users WHERE email = ${validatedData.email} AND id != ${validatedData.studentId}
    `;

    if (existingUser.length > 0) {
      return { success: false, error: 'This email is already in use' };
    }

    // Verify user has a student profile
    const profileCheck = await sql`
      SELECT user_id FROM student_profiles WHERE user_id = ${validatedData.studentId}
    `;

    if (profileCheck.length === 0) {
      return { success: false, error: 'Student profile not found' };
    }

    // Update user profile with validated data
    const result = await sql`
      UPDATE users
      SET first_name = ${validatedData.firstName},
          last_name = ${validatedData.lastName},
          email = ${validatedData.email},
          birthday = ${validatedData.dateOfBirth},
          updated_at = NOW()
      WHERE id = ${validatedData.studentId}
      RETURNING id, email, first_name, last_name, birthday, is_active, email_verified, created_at, updated_at, last_login_at
    `;

    if (result.length === 0) {
      return { success: false, error: 'Failed to update profile' };
    }

    const updatedStudent: Student = {
      id: result[0].id,
      email: result[0].email,
      first_name: result[0].first_name,
      last_name: result[0].last_name,
      birthday: result[0].birthday,
      is_active: result[0].is_active,
      email_verified: result[0].email_verified,
      created_at: result[0].created_at,
      updated_at: result[0].updated_at,
      last_login_at: result[0].last_login_at,
    };

    return { success: true, data: updatedStudent };
  } catch (error: any) {
    console.error('[AUTH] Update profile error:', error);
    return { success: false, error: error.message || 'Failed to update profile' };
  }
}

// Update student password
export async function updateStudentPasswordAction(
  studentId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const sql = getDb();

    // SECURITY: Import validation
    const { passwordUpdateSchema } = await import('@/lib/validation');
    const { requireUserType } = await import('@/lib/session');

    // SECURITY: Get current session and verify authorization
    const session = await requireUserType('student');

    // SECURITY: Authorization check - user can only update their own password
    if (session.id !== studentId) {
      return { success: false, error: 'Forbidden: You can only update your own password' };
    }

    // SECURITY: Validate inputs
    const validatedData = passwordUpdateSchema.parse({
      studentId,
      currentPassword,
      newPassword,
    });

    // Server-side password validation for new password
    const passwordValidation = validatePassword(validatedData.newPassword);
    if (!passwordValidation.isValid) {
      return {
        success: false,
        error: 'New password does not meet requirements',
      };
    }

    // Verify user has student profile
    const profileCheck = await sql`
      SELECT user_id FROM student_profiles WHERE user_id = ${validatedData.studentId}
    `;

    if (profileCheck.length === 0) {
      return { success: false, error: 'Student not found' };
    }

    // Get user with password hash
    const result = await sql`
      SELECT password_hash
      FROM users
      WHERE id = ${validatedData.studentId}
    `;

    if (result.length === 0) {
      return { success: false, error: 'Student not found' };
    }

    const user = result[0];

    // Verify current password
    const isPasswordValid = await bcrypt.compare(validatedData.currentPassword, user.password_hash);
    if (!isPasswordValid) {
      return { success: false, error: 'Current password is incorrect' };
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(validatedData.newPassword, SALT_ROUNDS);

    // Update password
    await sql`
      UPDATE users
      SET password_hash = ${newPasswordHash},
          updated_at = NOW()
      WHERE id = ${validatedData.studentId}
    `;

    // SECURITY: Invalidate all existing sessions after password change
    // Note: In a stateless JWT setup, you should track token versions or blacklist old tokens
    // For now, log this security event
    console.log(`[SECURITY] Password changed for user ${validatedData.studentId}`);

    return { success: true };
  } catch (error: any) {
    console.error('[AUTH] Update password error:', error);
    return { success: false, error: 'Failed to update password' };
  }
}

// Sign out action
export async function signOutAction(): Promise<{ success: boolean }> {
  try {
    await removeAuthCookie();
    return { success: true };
  } catch (error) {
    console.error('[AUTH] Sign out error:', error);
    return { success: false };
  }
}
