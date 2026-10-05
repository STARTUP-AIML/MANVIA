export abstract class AppError extends Error {
  public abstract readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, isOperational = true) {
    super(message);
    this.name = this.constructor.name;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  public readonly statusCode = 400;
  public readonly details: Record<string, unknown> | undefined;

  constructor(message = 'Validation failed', details?: Record<string, unknown>) {
    super(message);
    this.details = details;
  }
}

export class UnauthorizedError extends AppError {
  public readonly statusCode = 401;

  constructor(message = 'Unauthorized') {
    super(message);
  }
}

export class ForbiddenError extends AppError {
  public readonly statusCode = 403;

  constructor(message = 'Forbidden') {
    super(message);
  }
}

export class NotFoundError extends AppError {
  public readonly statusCode = 404;

  constructor(message = 'Resource not found') {
    super(message);
  }
}

export class ConflictError extends AppError {
  public readonly statusCode = 409;

  constructor(message = 'Conflict detected') {
    super(message);
  }
}

export class TooManyRequestsError extends AppError {
  public readonly statusCode = 429;
  public readonly retryAfterSeconds: number | undefined;

  constructor(message = 'Too many requests, please try again later', retryAfterSeconds?: number) {
    super(message);
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class InternalServerError extends AppError {
  public readonly statusCode = 500;

  constructor(message = 'Internal server error') {
    super(message, false);
  }
}
