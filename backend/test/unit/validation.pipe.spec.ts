import { describe, it, expect } from 'vitest';
import { BadRequestException, type ArgumentMetadata } from '@nestjs/common';
import {
  createValidationPipe,
  formatValidationErrors,
} from '../../src/common/pipes/validation.pipe.js';
import { ValidationTestDto } from '../../src/common/dto/validation-test.dto.js';
import type { ValidationError as ClassValidatorError } from '@nestjs/common';

describe('ValidationPipe (Unit)', () => {
  const pipe = createValidationPipe();
  const metadata: ArgumentMetadata = {
    type: 'body',
    metatype: ValidationTestDto,
  };

  it('should pass valid DTO payload and transform types', async () => {
    const validData = {
      name: 'Dr. John Doe',
      email: 'john.doe@manvia.health',
      age: '45', // String input should transform to number
    };

    const result = (await pipe.transform(validData, metadata)) as ValidationTestDto;
    expect(result.name).toBe('Dr. John Doe');
    expect(result.email).toBe('john.doe@manvia.health');
    expect(result.age).toBe(45);
    expect(typeof result.age).toBe('number');
  });

  it('should reject invalid input and throw BadRequestException with formatted details', async () => {
    const invalidData = {
      // name missing (required string)
      email: 'not-an-email', // invalid email format
    };

    await expect(pipe.transform(invalidData, metadata)).rejects.toThrow(BadRequestException);

    try {
      await pipe.transform(invalidData, metadata);
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestException);
      const response = (err as BadRequestException).getResponse() as {
        error: string;
        details: { field: string; message: string }[];
      };
      expect(response.error).toBe('VALIDATION_FAILED');
      expect(response.details.some((d) => d.field === 'email')).toBe(true);
      expect(response.details.some((d) => d.field === 'name')).toBe(true);
    }
  });

  it('should reject unknown non-whitelisted properties (forbidNonWhitelisted)', async () => {
    const dataWithHackerField = {
      name: 'Jane Doe',
      email: 'jane@manvia.health',
      isAdmin: true, // Non-whitelisted malicious property
    };

    await expect(pipe.transform(dataWithHackerField, metadata)).rejects.toThrow(
      BadRequestException,
    );

    try {
      await pipe.transform(dataWithHackerField, metadata);
    } catch (err) {
      const response = (err as BadRequestException).getResponse() as {
        details: { field: string; message: string }[];
      };
      expect(response.details.some((d) => d.message.includes('isAdmin'))).toBe(true);
    }
  });

  it('should format recursive nested validation errors correctly', () => {
    const nestedErrors: ClassValidatorError[] = [
      {
        property: 'profile',
        children: [
          {
            property: 'contact',
            constraints: { isPhoneNumber: 'contact must be a valid phone number' },
            children: [],
          },
        ],
      },
    ];

    const formatted = formatValidationErrors(nestedErrors);
    expect(formatted).toHaveLength(1);
    expect(formatted[0]?.field).toBe('profile.contact');
    expect(formatted[0]?.message).toBe('contact must be a valid phone number');
  });
});
