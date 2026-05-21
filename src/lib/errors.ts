/**
 * Standardised error classes for the SinaiCamps platform.
 *
 * All API errors should use these classes so that the catch-all route
 * handlers can produce a consistent JSON error envelope:
 *   { error: { code: string, message: string, details?: any } }
 */

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(message: string, code: string, statusCode: number, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class AuthError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'AuthError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 'FORBIDDEN', 403);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(message, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests', retryAfterSeconds?: number) {
    super(
      message,
      'RATE_LIMIT',
      429,
      retryAfterSeconds ? { retryAfter: retryAfterSeconds } : undefined
    );
    this.name = 'RateLimitError';
  }
}

export class InternalError extends AppError {
  constructor(message = 'Internal server error') {
    super(message, 'INTERNAL_ERROR', 500);
    this.name = 'InternalError';
  }
}

/**
 * Standard JSON error envelope shape.
 */
export interface ErrorEnvelope {
  error: string;
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Converts an AppError (or unknown error) into a standard Response.
 * In production, internal error messages are not leaked to the client.
 */
export function errorResponse(err: unknown): Response {
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Internal server error';
  let details: unknown = undefined;

  const isProd = process.env.NODE_ENV === 'production';

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err instanceof Error) {
    if (!isProd) {
      message = err.message;
    }
  }

  const envelope: ErrorEnvelope = {
    error: message,
    code,
    message,
  };
  if (details !== undefined) {
    envelope.details = details;
  }

  return new Response(JSON.stringify(envelope), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' },
  });
}
