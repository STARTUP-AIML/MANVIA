import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Controller, Post, Body } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationTestDto } from '../../src/common/dto/validation-test.dto.js';
import { createFastifyAdapter } from '../../src/main.js';
import { createValidationPipe } from '../../src/common/pipes/validation.pipe.js';
import { GlobalExceptionFilter } from '../../src/common/filters/global-exception.filter.js';
import { ConfigModule } from '../../src/config/config.module.js';

@Controller('test-validation')
class TestValidationController {
  @Post()
  public submitPayload(@Body() dto: ValidationTestDto) {
    return { success: true, data: dto };
  }
}

describe('Validation Pipeline (E2E)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule],
      controllers: [TestValidationController],
    }).compile();

    const adapter = createFastifyAdapter();
    app = moduleRef.createNestApplication<NestFastifyApplication>(adapter);

    app.useGlobalPipes(createValidationPipe());
    app.useGlobalFilters(new GlobalExceptionFilter({ NODE_ENV: 'test' }));

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should accept valid payload and perform type transformation', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/test-validation',
      payload: {
        name: 'Dr. Jane Smith',
        email: 'jane.smith@manvia.health',
        age: '38', // string converts to number
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.age).toBe(38);
    expect(typeof body.data.age).toBe('number');
  });

  it('should reject invalid input with 400 and structured validation details', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/test-validation',
      payload: {
        name: 12345, // invalid type
        email: 'not-an-email', // invalid email
      },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.statusCode).toBe(400);
    expect(body.error).toBe('VALIDATION_FAILED');
    expect(body.message).toBe('Request validation failed');
    expect(Array.isArray(body.details)).toBe(true);
    expect(body.requestId).toBeDefined();
  });

  it('should reject payload with unknown / non-whitelisted properties (forbidNonWhitelisted)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/test-validation',
      payload: {
        name: 'Dr. Jane Smith',
        email: 'jane.smith@manvia.health',
        maliciousField: 'exploit',
      },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.statusCode).toBe(400);
    expect(body.error).toBe('VALIDATION_FAILED');
    expect(JSON.stringify(body.details)).toContain('maliciousField');
  });
});
