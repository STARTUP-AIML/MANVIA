import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ConfigService } from './config/config.service.js';

@ApiTags('System')
@Controller()
export class AppController {
  constructor(private readonly config: ConfigService) {}

  @Get()
  @ApiOperation({ summary: 'Platform metadata and root status' })
  @ApiResponse({ status: 200, description: 'Platform is online and responding' })
  public getRoot() {
    return {
      name: this.config.appName,
      status: 'online',
      version: '0.1.0-phase2',
      environment: this.config.nodeEnv,
      documentation: this.config.isSwaggerEnabled ? `/${this.config.swaggerPath}` : 'disabled',
    };
  }

  @Get('api/v1')
  @ApiOperation({ summary: 'API v1 baseline status' })
  @ApiResponse({ status: 200, description: 'API v1 root endpoint' })
  public getApiV1() {
    return {
      name: this.config.appName,
      status: 'online',
      version: '0.1.0-phase2',
      environment: this.config.nodeEnv,
      prefix: 'api/v1',
    };
  }
}
