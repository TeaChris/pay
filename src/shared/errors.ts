/** Application error hierarchy. All errors extend AppError for consistent handling. */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    isOperational = true,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ─── 400 Bad Request ────────────────────────────────────────────

export class ValidationError extends AppError {
  constructor(message = 'Invalid request data') {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

// ─── 401 Unauthorized ───────────────────────────────────────────

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_REQUIRED');
  }
}

export class InvalidCredentialsError extends AppError {
  constructor() {
    super('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }
}

export class TokenExpiredError extends AppError {
  constructor() {
    super('Token has expired', 401, 'TOKEN_EXPIRED');
  }
}

export class InvalidTokenError extends AppError {
  constructor() {
    super('Invalid or malformed token', 401, 'INVALID_TOKEN');
  }
}

export class SessionRevokedError extends AppError {
  constructor() {
    super('Session has been revoked', 401, 'SESSION_REVOKED');
  }
}

export class RefreshTokenReplayError extends AppError {
  constructor() {
    super('Refresh token replay detected', 401, 'REFRESH_TOKEN_REPLAY');
  }
}

// ─── 403 Forbidden ──────────────────────────────────────────────

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class AccountLockedError extends AppError {
  constructor() {
    super('Account is locked. Contact support.', 403, 'ACCOUNT_LOCKED');
  }
}

export class EmailNotVerifiedError extends AppError {
  constructor() {
    super('Email verification required', 403, 'EMAIL_NOT_VERIFIED');
  }
}

export class MfaRequiredError extends AppError {
  public readonly mfaChallengeToken: string;

  constructor(mfaChallengeToken: string) {
    super('MFA verification required', 403, 'MFA_REQUIRED');
    this.mfaChallengeToken = mfaChallengeToken;
  }
}

// ─── 404 Not Found ──────────────────────────────────────────────

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

// ─── 409 Conflict ───────────────────────────────────────────────

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
  }
}

// ─── 429 Too Many Requests ──────────────────────────────────────

export class RateLimitError extends AppError {
  public readonly retryAfterSec: number;

  constructor(retryAfterSec: number) {
    super('Too many requests', 429, 'RATE_LIMIT_EXCEEDED');
    this.retryAfterSec = retryAfterSec;
  }
}

// ─── 500 Internal ───────────────────────────────────────────────

export class InternalError extends AppError {
  constructor(message = 'Internal server error') {
    super(message, 500, 'INTERNAL_ERROR', false);
  }
}
