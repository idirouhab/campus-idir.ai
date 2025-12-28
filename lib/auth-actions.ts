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
  lastName: string
): Promise<AuthResponse> {
  try {
    const sql = getDb();

    // Validate input
    if (!email || !password || !firstName || !lastName) {
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

    // Check if student already exists
    const existingStudent = await sql`
      SELECT id FROM students WHERE email = ${normalizedEmail}
    `;

    if (existingStudent.length > 0) {
      return { success: false, error: 'This email is already registered' };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create new student
    const result = await sql`
      INSERT INTO students (email, password_hash, first_name, last_name, email_verified)
      VALUES (${normalizedEmail}, ${passwordHash}, ${firstName}, ${lastName}, false)
      RETURNING id, email, first_name, last_name, email_verified, created_at, updated_at, last_login_at
    `;

    if (result.length === 0) {
      console.error('Signup error: No rows returned');
      return { success: false, error: 'Failed to create account' };
    }

    const newStudent: Student = {
      id: result[0].id,
      email: result[0].email,
      first_name: result[0].first_name,
      last_name: result[0].last_name,
      email_verified: result[0].email_verified,
      created_at: result[0].created_at,
      updated_at: result[0].updated_at,
      last_login_at: result[0].last_login_at,
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

    // Validate input
    if (!email || !password) {
      return { success: false, error: 'Email and password are required' };
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Get student with password hash
    const result = await sql`
      SELECT id, email, first_name, last_name, email_verified, created_at, updated_at, last_login_at, password_hash
      FROM students
      WHERE email = ${normalizedEmail}
    `;

    if (result.length === 0) {
      // Sanitized error - don't reveal if user exists
      return { success: false, error: 'Invalid credentials' };
    }

    const student = result[0];

    if (!student.password_hash) {
      // Sanitized error
      return { success: false, error: 'Invalid credentials' };
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, student.password_hash);

    if (!isPasswordValid) {
      // Sanitized error - same message as above
      return { success: false, error: 'Invalid credentials' };
    }

    // Generate JWT token
    const token = await generateAccessToken(
      student.id,
      'student',
      student.email
    );

    // Set secure httpOnly cookie
    await setAuthCookie(token);

    // Update last login
    await sql`
      UPDATE students
      SET last_login_at = NOW(), updated_at = NOW()
      WHERE id = ${student.id}
    `;

    // Return student data without password hash
    const studentData: Student = {
      id: student.id,
      email: student.email,
      first_name: student.first_name,
      last_name: student.last_name,
      email_verified: student.email_verified,
      created_at: student.created_at,
      updated_at: student.updated_at,
      last_login_at: student.last_login_at,
    };

    return { success: true, data: studentData };
  } catch (error: any) {
    console.error('[AUTH] Sign in error:', error);
    // Sanitized error message
    return { success: false, error: 'Authentication failed' };
  }
}

// Verify student exists (for auth check)
export async function verifyStudentAction(studentId: string): Promise<AuthResponse> {
  try {
    const sql = getDb();

    const result = await sql`
      SELECT id, email, first_name, last_name, email_verified, created_at, updated_at, last_login_at
      FROM students
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
  email: string
): Promise<AuthResponse> {
  try {
    const sql = getDb();

    // Validate input
    if (!firstName || !lastName || !email) {
      return { success: false, error: 'All fields are required' };
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Check if email is taken by another student
    const existingStudent = await sql`
      SELECT id FROM students WHERE email = ${normalizedEmail} AND id != ${studentId}
    `;

    if (existingStudent.length > 0) {
      return { success: false, error: 'This email is already in use' };
    }

    // Update student profile
    const result = await sql`
      UPDATE students
      SET first_name = ${firstName},
          last_name = ${lastName},
          email = ${normalizedEmail},
          updated_at = NOW()
      WHERE id = ${studentId}
      RETURNING id, email, first_name, last_name, email_verified, created_at, updated_at, last_login_at
    `;

    if (result.length === 0) {
      return { success: false, error: 'Failed to update profile' };
    }

    const updatedStudent: Student = {
      id: result[0].id,
      email: result[0].email,
      first_name: result[0].first_name,
      last_name: result[0].last_name,
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

    // Get student with password hash
    const result = await sql`
      SELECT password_hash
      FROM students
      WHERE id = ${studentId}
    `;

    if (result.length === 0) {
      return { success: false, error: 'Student not found' };
    }

    const student = result[0];

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, student.password_hash);
    if (!isPasswordValid) {
      return { success: false, error: 'Current password is incorrect' };
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update password
    await sql`
      UPDATE students
      SET password_hash = ${newPasswordHash},
          updated_at = NOW()
      WHERE id = ${studentId}
    `;

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
