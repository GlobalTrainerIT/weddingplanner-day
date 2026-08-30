import type { AuthError } from '@supabase/supabase-js';

/** The exact symbol set Supabase's password policy accepts. */
export const ALLOWED_SYMBOLS = '!@#$%^&*()_+-=[]{};\'\\:"|<>?,./`~';

export interface PasswordRule {
  key: string;
  label: string;
  test: (pw: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { key: 'length', label: 'At least 8 characters', test: pw => pw.length >= 8 },
  { key: 'upper', label: 'At least one uppercase letter', test: pw => /[A-Z]/.test(pw) },
  { key: 'lower', label: 'At least one lowercase letter', test: pw => /[a-z]/.test(pw) },
  { key: 'digit', label: 'At least one digit', test: pw => /[0-9]/.test(pw) },
  { key: 'symbol', label: 'At least one symbol', test: pw => /[^a-zA-Z0-9\s]/.test(pw) },
];

export function passwordStrength(pw: string): { score: number; passed: PasswordRule[]; failed: PasswordRule[] } {
  const passed = PASSWORD_RULES.filter(r => r.test(pw));
  const failed = PASSWORD_RULES.filter(r => !r.test(pw));
  return { score: passed.length, passed, failed };
}

export function meetsAllRules(pw: string): boolean {
  return PASSWORD_RULES.every(r => r.test(pw));
}

/** True when the Supabase error indicates a weak/breached password on sign-in. */
export function isWeakPasswordError(err: AuthError | null): boolean {
  if (!err) return false;
  return err.name === 'WeakPasswordError' || err.code === 'weak_password';
}

/** Extract the human-readable reasons array from a WeakPasswordError. */
export function weakPasswordReasons(err: AuthError | null): string[] {
  if (!err) return [];
  const raw = (err as AuthError & { reasons?: Array<{ message?: string }> }).reasons;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map(r => r.message).filter((m): m is string => typeof m === 'string');
  }
  return [];
}

/** True when the server rejected the password because it appeared in a breach. */
export function isBreachedPasswordError(err: AuthError | null): boolean {
  if (!err) return false;
  return err.code === 'breached_password' || err.message?.toLowerCase().includes('breach');
}

/** Determine whether a session is older than the given threshold and needs reauthentication. */
export function sessionNeedsReauth(createdAt: number | undefined, maxAgeMs = 24 * 60 * 60 * 1000): boolean {
  if (!createdAt) return false;
  return Date.now() - createdAt > maxAgeMs;
}

export function getAuthMethodAAL(): 'aal1' | 'aal2' {
  return 'aal1';
}

/**
 * Turn a provider auth error into a message that is safe to show a visitor.
 *
 * Actionable errors (rate limiting, password policy, network trouble) are passed
 * through so failures are never silent. Errors that would reveal whether a given
 * email already has an account — or whether that account is confirmed — are
 * collapsed into a single neutral message, so the form cannot be used to
 * enumerate our users.
 */
export function safeAuthErrorMessage(
  err: AuthError | null,
  context: 'signin' | 'signup',
  fallback: string,
): string {
  if (!err) return fallback;

  const code = (err.code || '').toLowerCase();
  const msg = (err.message || '').toLowerCase();

  // Pass through: tells the visitor something they can act on and reveals no
  // account state.
  const passThrough =
    code.includes('rate_limit') ||
    code.includes('over_request') ||
    code.includes('over_email') ||
    code === 'weak_password' ||
    code === 'breached_password' ||
    code === 'validation_failed' ||
    code === 'captcha_failed' ||
    code === 'signup_disabled' ||
    code === 'email_address_invalid' ||
    msg.includes('rate limit') ||
    msg.includes('too many') ||
    msg.includes('password should') ||
    msg.includes('network') ||
    msg.includes('failed to fetch');

  if (passThrough) return err.message || fallback;

  // Everything else — invalid credentials, unconfirmed email, already
  // registered, user not found — becomes one indistinguishable message.
  return context === 'signup'
    ? 'We could not create your account with those details. If you already have an account, try signing in instead.'
    : 'Email or password is incorrect. Please try again.';
}
