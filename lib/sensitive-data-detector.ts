export interface SensitiveDataMatch {
  pattern: string;
  description: string;
}

/**
 * Detect potentially sensitive information in text
 * Returns array of detected patterns
 */
export function detectSensitiveData(text: string): SensitiveDataMatch[] {
  const matches: SensitiveDataMatch[] = [];

  // Password-like patterns
  if (/password\s*[:=]\s*["']?[^\s"']+/i.test(text)) {
    matches.push({
      pattern: 'password',
      description: 'Password credential',
    });
  }

  // API key patterns
  if (/api[_-]?key\s*[:=]\s*["']?[A-Za-z0-9_\-]{16,}/i.test(text)) {
    matches.push({
      pattern: 'api_key',
      description: 'API key',
    });
  }

  // Secret/token patterns
  if (/(secret|token)\s*[:=]\s*["']?[A-Za-z0-9_\-]{16,}/i.test(text)) {
    matches.push({
      pattern: 'secret_token',
      description: 'Secret or token',
    });
  }

  // Bearer token patterns
  if (/bearer\s+[A-Za-z0-9_\-\.]{20,}/i.test(text)) {
    matches.push({
      pattern: 'bearer_token',
      description: 'Bearer token',
    });
  }

  // Authorization header patterns
  if (/authorization\s*[:=]\s*["']?[^\s"']{20,}/i.test(text)) {
    matches.push({
      pattern: 'authorization',
      description: 'Authorization header',
    });
  }

  // AWS/Cloud credentials
  if (/AKIA[0-9A-Z]{16}/.test(text)) {
    matches.push({
      pattern: 'aws_key',
      description: 'AWS access key',
    });
  }

  // Private keys
  if (/-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----/.test(text)) {
    matches.push({
      pattern: 'private_key',
      description: 'Private cryptographic key',
    });
  }

  // Secret key patterns (sk-...)
  if (/\bsk[-_][A-Za-z0-9]{16,}/i.test(text)) {
    matches.push({
      pattern: 'secret_key',
      description: 'Secret key (sk-)',
    });
  }

  // Email addresses (warn if many)
  const emailMatches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
  if (emailMatches && emailMatches.length > 2) {
    matches.push({
      pattern: 'emails',
      description: 'Multiple email addresses',
    });
  }

  // Phone numbers (basic pattern)
  const phoneMatches = text.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g);
  if (phoneMatches && phoneMatches.length > 0) {
    matches.push({
      pattern: 'phone',
      description: 'Phone number',
    });
  }

  // Credit card patterns (basic check)
  if (/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/.test(text)) {
    matches.push({
      pattern: 'credit_card',
      description: 'Potential credit card number',
    });
  }

  return matches;
}

/**
 * Check if text contains sensitive data
 */
export function hasSensitiveData(text: string): boolean {
  return detectSensitiveData(text).length > 0;
}
