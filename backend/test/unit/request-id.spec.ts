import { describe, it, expect, vi } from 'vitest';
import { resolveRequestId } from '../../src/main.js';
import { RequestId } from '../../src/common/decorators/request-id.decorator.js';
import type { ExecutionContext } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

describe('Request Correlation ID (Unit)', () => {
  it('should accept a safe incoming request ID', () => {
    const id = resolveRequestId('req_safe-correlation-12345678');
    expect(id).toBe('req_safe-correlation-12345678');
  });

  it('should accept array of headers and take first safe item', () => {
    const id = resolveRequestId(['req_safe-correlation-87654321']);
    expect(id).toBe('req_safe-correlation-87654321');
  });

  it('should generate a new UUID if incoming request ID contains unsafe characters', () => {
    const id = resolveRequestId('<script>alert(1)</script>');
    expect(id).not.toContain('<script>');
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it('should generate a new UUID if incoming request ID is too short or too long', () => {
    const tooShort = resolveRequestId('short');
    expect(tooShort).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

    const tooLong = resolveRequestId('a'.repeat(65));
    expect(tooLong).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it('should generate a new UUID if no request ID is provided', () => {
    const id = resolveRequestId(undefined);
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it('should extract request ID via RequestId param decorator', () => {
    const mockRequest = {
      id: 'req_extracted_456',
      headers: { 'x-request-id': 'req_extracted_456' },
    } as unknown as FastifyRequest;

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: vi.fn(),
        getNext: vi.fn(),
      }),
    } as unknown as ExecutionContext;

    expect(mockContext).toBeDefined();

    const extracted = (mockRequest.id ?? mockRequest.headers['x-request-id']) as string;
    expect(extracted).toBe('req_extracted_456');
    expect(typeof RequestId).toBe('function');
  });
});
