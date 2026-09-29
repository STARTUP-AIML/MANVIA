import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HttpException, HttpStatus, type ArgumentsHost } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  GlobalExceptionFilter,
  type ApiErrorResponse,
} from '../../src/common/filters/global-exception.filter.js';
import {
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InternalServerError,
} from '../../src/common/errors/app-error.js';

describe('GlobalExceptionFilter (Unit)', () => {
  let filter: GlobalExceptionFilter;
  let mockReply: {
    status: ReturnType<typeof vi.fn>;
    send: ReturnType<typeof vi.fn>;
    header: ReturnType<typeof vi.fn>;
  };
  let mockRequest: {
    id: string;
    method: string;
    url: string;
    headers: Record<string, string>;
  };
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new GlobalExceptionFilter({ NODE_ENV: 'development' });

    mockReply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      header: vi.fn().mockReturnThis(),
    };

    mockRequest = {
      id: 'req_test123',
      method: 'GET',
      url: '/test-route',
      headers: { 'x-request-id': 'req_test123' },
    };

    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockReply as unknown as FastifyReply,
        getRequest: () => mockRequest as unknown as FastifyRequest,
        getNext: vi.fn(),
      }),
    } as unknown as ArgumentsHost;
  });

  it('should format ValidationError into 400 with details and VALIDATION_FAILED code', () => {
    const error = new ValidationError('Invalid request body', { field: 'email' });
    filter.catch(error, mockHost);

    expect(mockReply.status).toHaveBeenCalledWith(400);
    const payload = mockReply.send.mock.calls[0]?.[0] as ApiErrorResponse;
    expect(payload.statusCode).toBe(400);
    expect(payload.error).toBe('VALIDATION_FAILED');
    expect(payload.message).toBe('Invalid request body');
    expect(payload.details).toEqual({ field: 'email' });
    expect(payload.requestId).toBe('req_test123');
    expect(mockReply.header).toHaveBeenCalledWith('x-request-id', 'req_test123');
  });

  it('should format UnauthorizedError into 401 UNAUTHORIZED', () => {
    const error = new UnauthorizedError();
    filter.catch(error, mockHost);

    expect(mockReply.status).toHaveBeenCalledWith(401);
    const payload = mockReply.send.mock.calls[0]?.[0] as ApiErrorResponse;
    expect(payload.statusCode).toBe(401);
    expect(payload.error).toBe('UNAUTHORIZED');
  });

  it('should format ForbiddenError into 403 FORBIDDEN', () => {
    const error = new ForbiddenError('Access denied');
    filter.catch(error, mockHost);

    expect(mockReply.status).toHaveBeenCalledWith(403);
    const payload = mockReply.send.mock.calls[0]?.[0] as ApiErrorResponse;
    expect(payload.statusCode).toBe(403);
    expect(payload.error).toBe('FORBIDDEN');
    expect(payload.message).toBe('Access denied');
  });

  it('should format NotFoundError into 404 NOT_FOUND', () => {
    const error = new NotFoundError('Resource missing');
    filter.catch(error, mockHost);

    expect(mockReply.status).toHaveBeenCalledWith(404);
    const payload = mockReply.send.mock.calls[0]?.[0] as ApiErrorResponse;
    expect(payload.statusCode).toBe(404);
    expect(payload.error).toBe('NOT_FOUND');
  });

  it('should format ConflictError into 409 CONFLICT', () => {
    const error = new ConflictError('Duplicate key');
    filter.catch(error, mockHost);

    expect(mockReply.status).toHaveBeenCalledWith(409);
    const payload = mockReply.send.mock.calls[0]?.[0] as ApiErrorResponse;
    expect(payload.statusCode).toBe(409);
    expect(payload.error).toBe('CONFLICT');
  });

  it('should format InternalServerError into 500 INTERNAL_SERVER_ERROR', () => {
    const error = new InternalServerError();
    filter.catch(error, mockHost);

    expect(mockReply.status).toHaveBeenCalledWith(500);
    const payload = mockReply.send.mock.calls[0]?.[0] as ApiErrorResponse;
    expect(payload.statusCode).toBe(500);
    expect(payload.error).toBe('INTERNAL_SERVER_ERROR');
  });

  it('should format NestJS HttpException with custom string response', () => {
    const error = new HttpException('Bad Request Sample', HttpStatus.BAD_REQUEST);
    filter.catch(error, mockHost);

    expect(mockReply.status).toHaveBeenCalledWith(400);
    const payload = mockReply.send.mock.calls[0]?.[0] as ApiErrorResponse;
    expect(payload.statusCode).toBe(400);
    expect(payload.error).toBe('BAD_REQUEST');
    expect(payload.message).toBe('Bad Request Sample');
  });

  it('should format NestJS Validation array into VALIDATION_FAILED with details', () => {
    const error = new HttpException(
      { message: ['email must be an email', 'name should not be empty'], error: 'Bad Request' },
      HttpStatus.BAD_REQUEST,
    );
    filter.catch(error, mockHost);

    expect(mockReply.status).toHaveBeenCalledWith(400);
    const payload = mockReply.send.mock.calls[0]?.[0] as ApiErrorResponse;
    expect(payload.statusCode).toBe(400);
    expect(payload.error).toBe('VALIDATION_FAILED');
    expect(payload.details).toEqual(['email must be an email', 'name should not be empty']);
  });

  it('should format unhandled generic Error into 500 and include stack in development', () => {
    const devFilter = new GlobalExceptionFilter({ NODE_ENV: 'development' });
    const error = new Error('Database connection explosion');
    devFilter.catch(error, mockHost);

    expect(mockReply.status).toHaveBeenCalledWith(500);
    const payload = mockReply.send.mock.calls[0]?.[0] as ApiErrorResponse;
    expect(payload.statusCode).toBe(500);
    expect(payload.error).toBe('INTERNAL_SERVER_ERROR');
    expect(payload.stack).toBeDefined();
  });

  it('should NEVER leak stack trace or internal message to clients in production', () => {
    const prodFilter = new GlobalExceptionFilter({ NODE_ENV: 'production' });
    const error = new Error('Sensitive database credentials failed');
    prodFilter.catch(error, mockHost);

    expect(mockReply.status).toHaveBeenCalledWith(500);
    const payload = mockReply.send.mock.calls[0]?.[0] as ApiErrorResponse;
    expect(payload.statusCode).toBe(500);
    expect(payload.error).toBe('INTERNAL_SERVER_ERROR');
    expect(payload.message).toBe('Internal server error');
    expect(payload.stack).toBeUndefined();
  });

  it('should generate a fallback request ID if none present on request', () => {
    mockRequest.id = '';
    mockRequest.headers = {};
    filter.catch(new Error('Generic failure'), mockHost);

    const payload = mockReply.send.mock.calls[0]?.[0] as ApiErrorResponse;
    expect(payload.requestId).toBeDefined();
    expect(payload.requestId.length).toBeGreaterThan(0);
  });
});
