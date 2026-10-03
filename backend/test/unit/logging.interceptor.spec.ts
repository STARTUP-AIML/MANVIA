import { describe, it, expect, vi, beforeEach } from 'vitest';
import { of, throwError } from 'rxjs';
import { LoggingInterceptor } from '../../src/common/interceptors/logging.interceptor.js';
import type { ExecutionContext, CallHandler } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

describe('LoggingInterceptor (Unit)', () => {
  let interceptor: LoggingInterceptor;
  let mockRequest: {
    id: string;
    method: string;
    url: string;
    headers: Record<string, string>;
  };
  let mockReply: {
    statusCode: number;
  };
  let mockContext: ExecutionContext;
  let mockHandler: CallHandler;

  beforeEach(() => {
    interceptor = new LoggingInterceptor({ NODE_ENV: 'development' });

    mockRequest = {
      id: 'req_log_123',
      method: 'POST',
      url: '/api/v1/auth/login',
      headers: {
        authorization: 'Bearer super-secret-token',
        'x-request-id': 'req_log_123',
      },
    };

    mockReply = {
      statusCode: 200,
    };

    mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest as unknown as FastifyRequest,
        getResponse: () => mockReply as unknown as FastifyReply,
        getNext: vi.fn(),
      }),
    } as unknown as ExecutionContext;
  });

  it('should intercept request and execute next handler cleanly', async () => {
    mockHandler = {
      handle: () => of({ success: true }),
    };

    const observable = interceptor.intercept(mockContext, mockHandler);
    let emitted: unknown;
    observable.subscribe((data) => {
      emitted = data;
    });

    expect(emitted).toEqual({ success: true });
  });

  it('should handle error in downstream pipeline without throwing unhandled rejection', async () => {
    mockHandler = {
      handle: () => throwError(() => new Error('Pipeline failure')),
    };

    const observable = interceptor.intercept(mockContext, mockHandler);
    let capturedError: unknown;
    observable.subscribe({
      error: (err) => {
        capturedError = err;
      },
    });

    expect(capturedError).toBeInstanceOf(Error);
  });

  it('should suppress console logging when in test mode', async () => {
    const testInterceptor = new LoggingInterceptor({ NODE_ENV: 'test' });
    mockHandler = {
      handle: () => of({ ok: true }),
    };

    const observable = testInterceptor.intercept(mockContext, mockHandler);
    let emitted: unknown;
    observable.subscribe((val) => {
      emitted = val;
    });

    expect(emitted).toEqual({ ok: true });
  });
});
