import { describe, it, expect, vi } from 'vitest';
import {
  AppError,
  ValidationError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  InternalError,
  errorResponse,
} from '../errors';

describe('AppError', () => {
  it('should create a base AppError', () => {
    const err = new AppError('test', 'TEST_CODE', 418);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
    expect(err.message).toBe('test');
    expect(err.code).toBe('TEST_CODE');
    expect(err.statusCode).toBe(418);
    expect(err.name).toBe('AppError');
  });
});

describe('ValidationError', () => {
  it('should create with status 400', () => {
    const err = new ValidationError('invalid input', [{ field: 'name', message: 'required' }]);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.statusCode).toBe(400);
    expect(err.details).toEqual([{ field: 'name', message: 'required' }]);
  });
});

describe('AuthError', () => {
  it('should create with status 401', () => {
    const err = new AuthError();
    expect(err.code).toBe('AUTH_ERROR');
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe('Unauthorized');
  });

  it('should accept custom message', () => {
    const err = new AuthError('Invalid token');
    expect(err.message).toBe('Invalid token');
  });
});

describe('ForbiddenError', () => {
  it('should create with status 403', () => {
    const err = new ForbiddenError();
    expect(err.code).toBe('FORBIDDEN');
    expect(err.statusCode).toBe(403);
  });
});

describe('NotFoundError', () => {
  it('should create with status 404', () => {
    const err = new NotFoundError();
    expect(err.code).toBe('NOT_FOUND');
    expect(err.statusCode).toBe(404);
  });
});

describe('RateLimitError', () => {
  it('should create with status 429', () => {
    const err = new RateLimitError();
    expect(err.code).toBe('RATE_LIMIT');
    expect(err.statusCode).toBe(429);
  });

  it('should include retryAfter in details', () => {
    const err = new RateLimitError('Too many', 30);
    expect(err.details).toEqual({ retryAfter: 30 });
  });
});

describe('InternalError', () => {
  it('should create with status 500', () => {
    const err = new InternalError();
    expect(err.code).toBe('INTERNAL_ERROR');
    expect(err.statusCode).toBe(500);
  });
});

describe('errorResponse', () => {
  it('should produce standard envelope for AppError', async () => {
    const err = new NotFoundError('Resource not found');
    const res = errorResponse(err);
    expect(res.status).toBe(404);
    expect(res.headers.get('Content-Type')).toBe('application/json');
    const body = await res.json();
    expect(body.code).toBe('NOT_FOUND');
    expect(body.error).toBe('Resource not found');
  });

  it('should include details when present', async () => {
    const err = new ValidationError('Bad input', { field: 'email' });
    const res = errorResponse(err);
    const body = await res.json();
    expect(body.details).toEqual({ field: 'email' });
  });

  it('should not include details when absent', async () => {
    const err = new NotFoundError();
    const res = errorResponse(err);
    const body = await res.json();
    expect(body.details).toBeUndefined();
  });

  it('should handle unknown errors as internal', async () => {
    const res = errorResponse(new Error('boom'));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.code).toBe('INTERNAL_ERROR');
  });

  it('should not leak error messages in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    try {
      const res = errorResponse(new Error('secret details'));
      const body = await res.json();
      expect(body.error).toBe('Internal server error');
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('should handle non-Error objects', async () => {
    const res = errorResponse('string error');
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.code).toBe('INTERNAL_ERROR');
  });
});
