import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AIRealtimeState } from '../realtime.enums.js';

export class RealtimeConnectionInfoDto {
  @ApiProperty({
    description: 'Protocol transport for realtime connection',
    example: 'websocket',
  })
  public transport!: string;

  @ApiProperty({
    description: 'Realtime gateway endpoint URL',
    example: 'wss://realtime.manvia.internal/v1/sessions/RTS-8A2D4F6E',
  })
  public endpoint!: string;

  @ApiProperty({
    description: 'Short-lived client session access token',
    example: 'rt_tok_9f3b1406e30b19c2',
  })
  public clientSessionToken!: string;

  @ApiProperty({
    description: 'Token validity in seconds',
    example: 3600,
  })
  public expiresInSeconds!: number;
}

export class AIRealtimeSessionResponseDto {
  @ApiProperty({
    description: 'Internal UUID of realtime session',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  public id!: string;

  @ApiProperty({
    description: 'Client-facing non-sequential session ID',
    example: 'RTS-8A2D4F6E',
  })
  public publicSessionId!: string;

  @ApiProperty({
    description: 'Model provider identifier',
    example: 'MOCK_REALTIME_PROVIDER',
  })
  public provider!: string;

  @ApiProperty({
    description: 'Model version or identifier',
    example: 'realtime-companion-v1',
  })
  public model!: string;

  @ApiProperty({
    description: 'Current session state',
    enum: AIRealtimeState,
    example: AIRealtimeState.IDLE,
  })
  public state!: AIRealtimeState;

  @ApiProperty({
    description: 'Supported communication modalities',
    example: ['AUDIO', 'TEXT'],
  })
  public supportedModalities!: string[];

  @ApiPropertyOptional({
    description: 'Connection parameters and short-lived credentials',
    type: RealtimeConnectionInfoDto,
  })
  public connectionInfo?: RealtimeConnectionInfoDto | null;

  @ApiProperty({
    description: 'Number of barge-in user interruptions during the session',
    example: 2,
  })
  public interruptionCount!: number;

  @ApiProperty({
    description: 'Session expiration timestamp',
    example: '2026-09-29T22:00:00.000Z',
  })
  public expiresAt!: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2026-09-29T21:00:00.000Z',
  })
  public createdAt!: string;
}
