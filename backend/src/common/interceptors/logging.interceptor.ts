import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  Logger,
  type NestInterceptor,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { type Observable, tap } from 'rxjs';
import type { EnvConfig } from '../../config/env.js';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');
  private readonly isTest: boolean;

  constructor(config?: Partial<EnvConfig>) {
    const env = config?.NODE_ENV ?? process.env.NODE_ENV ?? 'development';
    this.isTest = env === 'test';
  }

  public intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<FastifyRequest>();
    const reply = ctx.getResponse<FastifyReply>();

    const startTime = Date.now();
    const method = request.method;
    const url = request.url;
    const requestId =
      (request.id as string) || (request.headers['x-request-id'] as string) || 'unknown-req';

    return next.handle().pipe(
      tap({
        next: () => {
          if (this.isTest) return; // Suppress verbose logging during unit/e2e test runs
          const duration = Date.now() - startTime;
          const statusCode = reply.statusCode;
          this.logger.log(`[${requestId}] ${method} ${url} ${statusCode} +${duration}ms`);
        },
        error: (err: unknown) => {
          if (this.isTest) return;
          const duration = Date.now() - startTime;
          const statusCode =
            typeof err === 'object' && err !== null && 'status' in err
              ? (err as { status: number }).status
              : reply.statusCode || 500;

          this.logger.warn(`[${requestId}] ${method} ${url} ${statusCode} +${duration}ms (error)`);
        },
      }),
    );
  }
}
