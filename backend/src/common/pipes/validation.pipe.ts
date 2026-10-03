import {
  ValidationPipe,
  BadRequestException,
  type ValidationError as ClassValidatorError,
} from '@nestjs/common';

export interface ValidationErrorDetail {
  field: string;
  message: string;
}

/**
 * Recursively extracts formatted error messages from class-validator error tree.
 */
export function formatValidationErrors(
  errors: ClassValidatorError[],
  parentField = '',
): ValidationErrorDetail[] {
  const details: ValidationErrorDetail[] = [];

  for (const error of errors) {
    const fieldPath = parentField ? `${parentField}.${error.property}` : error.property;

    if (error.constraints) {
      for (const message of Object.values(error.constraints)) {
        details.push({
          field: fieldPath,
          message,
        });
      }
    }

    if (error.children && error.children.length > 0) {
      details.push(...formatValidationErrors(error.children, fieldPath));
    }
  }

  return details;
}

/**
 * Creates the production-grade NestJS ValidationPipe conforming to Phase 2 requirements:
 * - whitelist: true (strip non-decorated properties)
 * - forbidNonWhitelisted: true (reject unknown properties with 400 error)
 * - transform: true (automatically transform payloads into typed DTO instances)
 */
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
    exceptionFactory: (errors: ClassValidatorError[]) => {
      const details = formatValidationErrors(errors);
      return new BadRequestException({
        statusCode: 400,
        error: 'VALIDATION_FAILED',
        message: 'Request validation failed',
        details,
      });
    },
  });
}
