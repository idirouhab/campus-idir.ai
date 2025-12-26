export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
}

export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = [];
  let strengthScore = 0;

  // Minimum length
  if (password.length < 8) {
    errors.push('At least 8 characters');
  } else {
    strengthScore++;
  }

  // Contains uppercase
  if (!/[A-Z]/.test(password)) {
    errors.push('One uppercase letter');
  } else {
    strengthScore++;
  }

  // Contains lowercase
  if (!/[a-z]/.test(password)) {
    errors.push('One lowercase letter');
  } else {
    strengthScore++;
  }

  // Contains number
  if (!/[0-9]/.test(password)) {
    errors.push('One number');
  } else {
    strengthScore++;
  }

  // Contains special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('One special character (!@#$%...)');
  } else {
    strengthScore++;
  }

  // Determine strength
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  if (strengthScore >= 5) {
    strength = 'strong';
  } else if (strengthScore >= 3) {
    strength = 'medium';
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength,
  };
}
