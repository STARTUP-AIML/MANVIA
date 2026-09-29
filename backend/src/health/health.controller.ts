import { Controller, Get, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { HealthService } from './health.service.js';
import type { LivenessResult, ReadinessResult } from './health.interface.js';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Overall system health check' })
  @ApiResponse({ status: 200, description: 'Application process is responsive' })
  public getHealth(): LivenessResult {
    return this.healthService.checkLiveness();
  }

  @Get('live')
  @ApiOperation({ summary: 'Process liveness probe' })
  @ApiResponse({ status: 200, description: 'Application process is alive' })
  public getLive(): LivenessResult {
    return this.healthService.checkLiveness();
  }

  @Get('liveness')
  @ApiOperation({ summary: 'Process liveness probe (alias)' })
  @ApiResponse({ status: 200, description: 'Application process is alive' })
  public getLiveness(): LivenessResult {
    return this.healthService.checkLiveness();
  }

  @Get('ready')
  @ApiOperation({ summary: 'Application readiness probe' })
  @ApiResponse({ status: 200, description: 'Application is ready to accept traffic' })
  @ApiResponse({ status: 503, description: 'Application dependencies unhealthy' })
  public async getReady(@Res({ passthrough: true }) reply: FastifyReply): Promise<ReadinessResult> {
    const result = await this.healthService.checkReadiness();
    if (result.status === 'unhealthy') {
      reply.status(503);
    }
    return result;
  }

  @Get('readiness')
  @ApiOperation({ summary: 'Application readiness probe (alias)' })
  @ApiResponse({ status: 200, description: 'Application is ready to accept traffic' })
  @ApiResponse({ status: 503, description: 'Application dependencies unhealthy' })
  public async getReadiness(
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<ReadinessResult> {
    const result = await this.healthService.checkReadiness();
    if (result.status === 'unhealthy') {
      reply.status(503);
    }
    return result;
  }
}
