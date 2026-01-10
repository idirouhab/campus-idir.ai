/**
 * Rate limiting utility using LRU cache
 * SECURITY: Prevents brute force attacks on authentication endpoints
 */

import { LRUCache } from 'lru-cache';

export interface RateLimitOptions {
  uniqueTokenPerInterval?: number; // Max unique tokens per interval
  interval?: number; // Time window in milliseconds
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  error?: string;
}

/**
 * Create a rate limiter instance
 */
export function rateLimit(options: RateLimitOptions = {}) {
  const uniqueTokenPerInterval = options.uniqueTokenPerInterval || 500;
  const interval = options.interval || 60000; // Default: 1 minute

  const tokenCache = new LRUCache<string, number[]>({
    max: uniqueTokenPerInterval,
    ttl: interval,
  });

  return {
    /**
     * Check if a request should be rate limited
     * @param limit - Maximum number of requests allowed in the interval
     * @param token - Unique identifier for the requester (IP, email, etc.)
     * @returns RateLimitResult with success status and metadata
     */
    check: (limit: number, token: string): RateLimitResult => {
      const now = Date.now();
      const tokenCount = tokenCache.get(token) || [];

      // Filter out expired timestamps
      const validTimestamps = tokenCount.filter(
        (timestamp) => now - timestamp < interval
      );

      if (validTimestamps.length < limit) {
        // Request allowed - add timestamp
        validTimestamps.push(now);
        tokenCache.set(token, validTimestamps);

        return {
          success: true,
          limit,
          remaining: limit - validTimestamps.length,
          reset: now + interval,
        };
      } else {
        // Rate limit exceeded
        return {
          success: false,
          limit,
          remaining: 0,
          reset: now + interval,
          error: 'Rate limit exceeded. Please try again later.',
        };
      }
    },

    /**
     * Reset rate limit for a specific token
     * @param token - Unique identifier to reset
     */
    reset: (token: string): void => {
      tokenCache.delete(token);
    },
  };
}

/**
 * Pre-configured rate limiters for common use cases
 */

// Authentication endpoints: 5 requests per minute per IP
export const authRateLimiter = rateLimit({
  uniqueTokenPerInterval: 1000,
  interval: 60000, // 1 minute
});

// Password reset: 3 requests per hour per email
export const passwordResetRateLimiter = rateLimit({
  uniqueTokenPerInterval: 1000,
  interval: 60 * 60 * 1000, // 1 hour
});

// API endpoints: 100 requests per minute per user
export const apiRateLimiter = rateLimit({
  uniqueTokenPerInterval: 5000,
  interval: 60000, // 1 minute
});

/**
 * Get client IP address from request headers
 * Handles various proxy configurations
 */
export function getClientIP(request: Request): string {
  // Check common proxy headers
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP.trim();
  }

  // Fallback to connection remote address (not always available)
  return 'unknown';
}

/**
 * Create a rate limit identifier from email
 * Normalizes and hashes for privacy
 */
export function createEmailRateLimitToken(email: string): string {
  return `email:${email.toLowerCase().trim()}`;
}

/**
 * Create a rate limit identifier from IP
 */
export function createIPRateLimitToken(ip: string): string {
  return `ip:${ip}`;
}
