import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import crypto from 'node:crypto';
import { AppError } from '../errors/app-error.js';
import type { EnvConfig } from '../../config/env.js';

export interface ApiErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  details?: unknown;
  requestId: string;
  timestamp: string;
  stack?: string | undefined;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);
  private readonly isProduction: boolean;
  private readonly isDevelopment: boolean;

  constructor(config?: Partial<EnvConfig>) {
    const env = config?.NODE_ENV ?? process.env.NODE_ENV ?? 'development';
    this.isProduction = env === 'production';
    this.isDevelopment = env === 'development';
  }

  public catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    const requestId =
      (request?.id as string) ||
      (request?.headers?.['x-request-id'] as string) ||
      crypto.randomUUID();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let message = 'Internal server error';
    let details: unknown = undefined;

    if (exception instanceof AppError) {
      statusCode = exception.statusCode;
      errorCode = this.mapAppErrorToCode(exception);
      message = exception.message;
      if ('details' in exception && (exception as { details?: unknown }).details !== undefined) {
        details = (exception as { details?: unknown }).details;
      }
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
        errorCode = this.mapStatusToErrorCode(statusCode);
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;
        message = typeof resObj.message === 'string' ? resObj.message : exception.message;
        errorCode =
          typeof resObj.error === 'string'
            ? this.normalizeErrorCode(resObj.error, statusCode)
            : this.mapStatusToErrorCode(statusCode);

        if (resObj.details !== undefined) {
          details = resObj.details;
        } else if (Array.isArray(resObj.message)) {
          details = resObj.message;
          message = 'Request validation failed';
          errorCode = 'VALIDATION_FAILED';
        }
      }
    } else if (exception instanceof Error) {
      const fastifyError = exception as Error & { statusCode?: number; code?: string };
      if (typeof fastifyError.statusCode === 'number') {
        statusCode = fastifyError.statusCode;
        errorCode = fastifyError.code ?? this.mapStatusToErrorCode(statusCode);
        message = fastifyError.message;
      } else {
        statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
        errorCode = 'INTERNAL_SERVER_ERROR';
        message = this.isProduction ? 'Internal server error' : exception.message;
      }
    }

    if (statusCode >= 500) {
      this.logger.error(
        `[${requestId}] ${request?.method ?? 'UNKNOWN'} ${request?.url ?? ''} — ${statusCode}: ${
          exception instanceof Error ? exception.message : 'Unknown exception'
        }`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    const errorPayload: ApiErrorResponse = {
      statusCode,
      error: errorCode,
      message,
      requestId,
      timestamp: new Date().toISOString(),
    };

    if (details !== undefined) {
      errorPayload.details = details;
    }

    // Stack traces are strictly forbidden in production to prevent information disclosure
    if (this.isDevelopment && exception instanceof Error && statusCode >= 500) {
      errorPayload.stack = exception.stack;
    }

    // Ensure correlation headers are stamped on response
    response.header('x-request-id', requestId);
    response.header('x-correlation-id', requestId);

    response.status(statusCode).send(errorPayload);
  }

  private mapAppErrorToCode(error: AppError): string {
    const name = error.constructor.name;
    switch (name) {
      case 'ValidationError':
        return 'VALIDATION_FAILED';
      case 'UnauthorizedError':
        return 'UNAUTHORIZED';
      case 'ForbiddenError':
        return 'FORBIDDEN';
      case 'NotFoundError':
        return 'NOT_FOUND';
      case 'ConflictError':
        return 'CONFLICT';
      case 'InternalServerError':
        return 'INTERNAL_SERVER_ERROR';
      default:
        return this.mapStatusToErrorCode(error.statusCode);
    }
  }

  private mapStatusToErrorCode(status: number): string {
    switch (status) {
      case 400:
        return 'BAD_REQUEST';
      case 401:
        return 'UNAUTHORIZED';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      case 409:
        return 'CONFLICT';
      case 413:
        return 'PAYLOAD_TOO_LARGE';
      case 422:
        return 'UNPROCESSABLE_ENTITY';
      case 429:
        return 'TOO_MANY_REQUESTS';
      case 503:
        return 'SERVICE_UNAVAILABLE';
      default:
        return 'INTERNAL_SERVER_ERROR';
    }
  }

  private normalizeErrorCode(error: string, status: number): string {
    if (error && error.trim().length > 0) {
      return error
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, '_');
    }
    return this.mapStatusToErrorCode(status);
  }
}
