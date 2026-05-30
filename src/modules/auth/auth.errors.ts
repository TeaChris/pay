/**
 * Generic auth messages designed to prevent user enumeration.
 * All messages are intentionally vague about account existence.
 */
export const AUTH_MESSAGES = {
  REGISTER_SUCCESS:
    'Registration successful. Please check your email to verify your account.',
  LOGIN_GENERIC_FAILURE: 'Invalid email or password',
  LOGOUT_SUCCESS: 'Logged out successfully',
  PASSWORD_RESET_REQUESTED:
    'If an account with that email exists, a password reset link has been sent.',
  PASSWORD_RESET_SUCCESS: 'Password has been reset successfully',
  EMAIL_VERIFICATION_SUCCESS: 'Email verified successfully',
  EMAIL_VERIFICATION_SENT: 'Verification email has been sent',
} as const;
