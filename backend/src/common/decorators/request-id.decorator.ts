import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

/**
 * Route handler parameter decorator to inject the current request's correlation ID.
 */
export const RequestId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest<FastifyRequest>();
  return (request.id ?? (request.headers['x-request-id'] as string) ?? '') as string;
});
