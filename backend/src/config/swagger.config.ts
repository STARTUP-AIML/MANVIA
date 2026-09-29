import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';
import type { EnvConfig } from './env.js';

export function createSwaggerDocument(app: INestApplication): OpenAPIObject {
  const documentConfig = new DocumentBuilder()
    .setTitle('MANVIA API')
    .setDescription(
      'MANVIA Healthcare & Wellness Platform — Production-grade Modular Monolith API Engine.',
    )
    .setVersion('0.1.0-phase2')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT bearer token for future authenticated endpoints',
        in: 'header',
      },
      'bearer-auth',
    )
    .build();

  return SwaggerModule.createDocument(app, documentConfig);
}

export function setupSwagger(app: INestApplication, config: EnvConfig): OpenAPIObject | null {
  if (!config.SWAGGER_ENABLED) {
    return null;
  }

  const document = createSwaggerDocument(app);
  SwaggerModule.setup(config.SWAGGER_PATH, app, document, {
    useGlobalPrefix: false,
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  return document;
}
