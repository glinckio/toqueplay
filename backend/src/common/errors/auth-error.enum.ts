export enum AuthErrorCode {
  // Register
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  INVALID_PASSWORD_FORMAT = 'INVALID_PASSWORD_FORMAT',
  PASSWORDS_DO_NOT_MATCH = 'PASSWORDS_DO_NOT_MATCH',

  // Login
  EMAIL_NOT_FOUND = 'EMAIL_NOT_FOUND',
  INVALID_PASSWORD = 'INVALID_PASSWORD',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',

  // Email verification
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  EMAIL_ALREADY_VERIFIED = 'EMAIL_ALREADY_VERIFIED',
  INVALID_OR_EXPIRED_CODE = 'INVALID_OR_EXPIRED_CODE',
  CODE_RESEND_COOLDOWN = 'CODE_RESEND_COOLDOWN',

  // General
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  INVALID_GOOGLE_TOKEN = 'INVALID_GOOGLE_TOKEN',
  INVALID_REFRESH_TOKEN = 'INVALID_REFRESH_TOKEN',

  // Password reset
  RESET_TOKEN_INVALID = 'RESET_TOKEN_INVALID',
  RESET_TOKEN_EXPIRED = 'RESET_TOKEN_EXPIRED',

  // LGPD / Consent
  CONSENT_REQUIRED = 'CONSENT_REQUIRED',
  CONSENT_OUTDATED = 'CONSENT_OUTDATED',
  DATA_EXPORT_RATE_LIMITED = 'DATA_EXPORT_RATE_LIMITED',
  DATA_EXPORT_NOT_READY = 'DATA_EXPORT_NOT_READY',
  ACCOUNT_DELETION_CONFIRMATION_REQUIRED = 'ACCOUNT_DELETION_CONFIRMATION_REQUIRED',
}

export const AuthErrorMessages: Record<AuthErrorCode, string> = {
  [AuthErrorCode.EMAIL_ALREADY_EXISTS]: 'This email is already registered',
  [AuthErrorCode.INVALID_PASSWORD_FORMAT]:
    'Password must be at least 6 characters long',
  [AuthErrorCode.PASSWORDS_DO_NOT_MATCH]: 'Passwords do not match',

  [AuthErrorCode.EMAIL_NOT_FOUND]: 'No account found with this email',
  [AuthErrorCode.INVALID_PASSWORD]: 'Incorrect password',
  [AuthErrorCode.EMAIL_NOT_VERIFIED]:
    'Email not verified. Please verify your email before logging in',

  [AuthErrorCode.USER_NOT_FOUND]: 'User not found',
  [AuthErrorCode.EMAIL_ALREADY_VERIFIED]: 'Email is already verified',
  [AuthErrorCode.INVALID_OR_EXPIRED_CODE]:
    'Invalid or expired verification code',
  [AuthErrorCode.CODE_RESEND_COOLDOWN]:
    'Please wait 1 minute before requesting a new code',

  [AuthErrorCode.INVALID_CREDENTIALS]: 'Invalid credentials',
  [AuthErrorCode.INVALID_GOOGLE_TOKEN]: 'Invalid Google token',
  [AuthErrorCode.INVALID_REFRESH_TOKEN]: 'Invalid or expired refresh token',

  [AuthErrorCode.RESET_TOKEN_INVALID]: 'Invalid reset token',
  [AuthErrorCode.RESET_TOKEN_EXPIRED]: 'Reset token has expired',

  [AuthErrorCode.CONSENT_REQUIRED]:
    'Consent to Terms and Privacy Policy is required (LGPD art. 8)',
  [AuthErrorCode.CONSENT_OUTDATED]:
    'Terms version changed — please re-consent',
  [AuthErrorCode.DATA_EXPORT_RATE_LIMITED]:
    'You can request one data export per day',
  [AuthErrorCode.DATA_EXPORT_NOT_READY]: 'Data export is not ready yet',
  [AuthErrorCode.ACCOUNT_DELETION_CONFIRMATION_REQUIRED]:
    'Account deletion requires email confirmation',
};
