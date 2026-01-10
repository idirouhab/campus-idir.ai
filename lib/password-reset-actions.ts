'use server';

import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '@/lib/email-service';

const SALT_ROUNDS = 10;
const TOKEN_EXPIRY_HOURS = 1;

interface PasswordResetResponse {
  success: boolean;
  error?: string;
}

/**
 * Request a password reset - generates token and sends email
 */
export async function requestPasswordResetAction(
  email: string,
  locale: string = 'en-US'
): Promise<PasswordResetResponse> {
  try {
    const sql = getDb();

    // SECURITY: Validate all inputs with Zod schema
    const { passwordResetRequestSchema } = await import('@/lib/validation');
    const validatedData = passwordResetRequestSchema.parse({ email, locale });

    // SECURITY: Rate limiting - 3 reset requests per hour per email
    const { passwordResetRateLimiter, createEmailRateLimitToken } = await import('@/lib/rate-limit');
    const rateLimitToken = createEmailRateLimitToken(validatedData.email);
    const rateLimitResult = passwordResetRateLimiter.check(3, rateLimitToken);

    if (!rateLimitResult.success) {
      // Return success anyway to prevent email enumeration, but don't send email
      // SECURITY: Don't log email in production
      if (process.env.NODE_ENV === 'development') {
        console.log('[PASSWORD_RESET] Rate limit exceeded for:', validatedData.email);
      } else {
        console.log('[PASSWORD_RESET] Rate limit exceeded');
      }
      return { success: true };
    }

    // Use validated and normalized email
    const normalizedEmail = validatedData.email;

    // Find user by email
    const users = await sql`
      SELECT id, email, first_name FROM users WHERE email = ${normalizedEmail} AND is_active = true
    `;

    if (users.length === 0) {
      // Don't reveal if user exists - return success anyway for security
      // SECURITY: Don't log email in production
      if (process.env.NODE_ENV === 'development') {
        console.log('[PASSWORD_RESET] User not found:', normalizedEmail);
      }
      return { success: true };
    }

    const user = users[0];

    // Generate random token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Hash the token before storing (for security)
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Calculate expiry time
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    // Invalidate any existing unused tokens for this user
    await sql`
      UPDATE password_reset_tokens
      SET used = true
      WHERE user_id = ${user.id} AND used = false
    `;

    // Store hashed token in database
    await sql`
      INSERT INTO password_reset_tokens (user_id, token, expires_at)
      VALUES (${user.id}, ${hashedToken}, ${expiresAt})
    `;

    // Generate reset URL with locale
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password/confirm?token=${resetToken}&locale=${validatedData.locale}`;

    // SECURITY: Only log in development (no PII in production logs)
    if (process.env.NODE_ENV === 'development') {
      console.log('═══════════════════════════════════════════════════════');
      console.log('PASSWORD RESET REQUEST');
      console.log('═══════════════════════════════════════════════════════');
      console.log('Email:', user.email);
      console.log('Name:', user.first_name);
      console.log('Reset URL:', resetUrl);
      console.log('Token expires at:', expiresAt.toISOString());
      console.log('Locale:', validatedData.locale);
      console.log('═══════════════════════════════════════════════════════');
    } else {
      // Production: Log without PII
      console.log('[PASSWORD_RESET] Reset email sent. Expires at:', expiresAt.toISOString());
    }

    // Send password reset email
    const emailResult = await sendPasswordResetEmail({
      to: user.email,
      firstName: user.first_name,
      resetUrl,
      locale: validatedData.locale,
    });

    if (!emailResult.success) {
      console.error('[PASSWORD_RESET] Failed to send email:', emailResult.error);
      // Don't return error to user for security (don't reveal if email exists)
      // But log it for debugging
    }

    return { success: true };
  } catch (error: any) {
    console.error('[PASSWORD_RESET] Request error:', error);
    return { success: false, error: 'Failed to process password reset request' };
  }
}

/**
 * Verify if a reset token is valid
 */
export async function verifyResetTokenAction(
  token: string
): Promise<{ valid: boolean; userId?: string; error?: string }> {
  try {
    const sql = getDb();

    if (!token) {
      return { valid: false, error: 'Token is required' };
    }

    // Hash the token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find token in database
    const tokens = await sql`
      SELECT user_id, expires_at, used
      FROM password_reset_tokens
      WHERE token = ${hashedToken}
    `;

    if (tokens.length === 0) {
      return { valid: false, error: 'Invalid or expired reset link' };
    }

    const tokenData = tokens[0];

    // Check if already used
    if (tokenData.used) {
      return { valid: false, error: 'This reset link has already been used' };
    }

    // Check if expired
    if (new Date(tokenData.expires_at) < new Date()) {
      return { valid: false, error: 'This reset link has expired' };
    }

    return { valid: true, userId: tokenData.user_id };
  } catch (error: any) {
    console.error('[PASSWORD_RESET] Verify token error:', error);
    return { valid: false, error: 'Failed to verify reset token' };
  }
}

/**
 * Reset password using valid token
 */
export async function resetPasswordAction(
  token: string,
  newPassword: string
): Promise<PasswordResetResponse> {
  try {
    const sql = getDb();

    // SECURITY: Validate all inputs with Zod schema
    const { passwordResetSchema } = await import('@/lib/validation');
    const validatedData = passwordResetSchema.parse({ token, newPassword });

    // Verify token first
    const verification = await verifyResetTokenAction(validatedData.token);
    if (!verification.valid || !verification.userId) {
      return { success: false, error: verification.error || 'Invalid token' };
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(validatedData.newPassword, SALT_ROUNDS);

    // Update user's password
    await sql`
      UPDATE users
      SET password_hash = ${passwordHash}, updated_at = NOW()
      WHERE id = ${verification.userId}
    `;

    // Mark token as used
    const hashedToken = crypto.createHash('sha256').update(validatedData.token).digest('hex');
    await sql`
      UPDATE password_reset_tokens
      SET used = true
      WHERE token = ${hashedToken}
    `;

    console.log('[PASSWORD_RESET] Password successfully reset for user:', verification.userId);

    return { success: true };
  } catch (error: any) {
    console.error('[PASSWORD_RESET] Reset password error:', error);
    return { success: false, error: 'Failed to reset password' };
  }
}
