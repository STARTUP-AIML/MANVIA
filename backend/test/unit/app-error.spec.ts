import { describe, it, expect } from 'vitest';
import {
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InternalServerError,
} from '../../src/common/errors/app-error.js';

describe('AppError Hierarchy (Unit)', () => {
  it('should construct ValidationError with 400 and optional details', () => {
    const error = new ValidationError('Invalid payload', { field: 'email' });
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('Invalid payload');
    expect(error.details).toEqual({ field: 'email' });
    expect(error.isOperational).toBe(true);
  });

  it('should construct UnauthorizedError with 401', () => {
    const error = new UnauthorizedError();
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe('Unauthorized');
    expect(error.isOperational).toBe(true);
  });

  it('should construct ForbiddenError with 403', () => {
    const error = new ForbiddenError('Access denied');
    expect(error.statusCode).toBe(403);
    expect(error.message).toBe('Access denied');
    expect(error.isOperational).toBe(true);
  });

  it('should construct NotFoundError with 404', () => {
    const error = new NotFoundError('User not found');
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe('User not found');
    expect(error.isOperational).toBe(true);
  });

  it('should construct ConflictError with 409', () => {
    const error = new ConflictError('Slot already booked');
    expect(error.statusCode).toBe(409);
    expect(error.message).toBe('Slot already booked');
    expect(error.isOperational).toBe(true);
  });

  it('should construct InternalServerError with 500 and non-operational flag', () => {
    const error = new InternalServerError();
    expect(error.statusCode).toBe(500);
    expect(error.message).toBe('Internal server error');
    expect(error.isOperational).toBe(false);
  });
});
