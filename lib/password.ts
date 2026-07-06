// Shared password policy, used by the client strength meter and mirrored by the
// server-side zod rules (lib/validators.ts). The hard requirements are: at least
// 8 characters, one letter, and one number.

export interface PasswordChecks {
  minLength: boolean;
  hasLetter: boolean;
  hasNumber: boolean;
}

export function checkPassword(pw: string): PasswordChecks {
  return {
    minLength: pw.length >= 8,
    hasLetter: /[a-zA-Z]/.test(pw),
    hasNumber: /[0-9]/.test(pw),
  };
}

/** True when the password meets every hard requirement. */
export function isPasswordValid(pw: string): boolean {
  const c = checkPassword(pw);
  return c.minLength && c.hasLetter && c.hasNumber;
}

/**
 * 0–4 strength score for the meter. Rewards length and character variety on top
 * of the hard requirements so users are nudged toward stronger passwords.
 */
export function passwordScore(pw: string): number {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  return Math.min(4, score);
}

export const PASSWORD_STRENGTH_LABELS = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'];
