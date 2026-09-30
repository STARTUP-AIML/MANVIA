import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AIRealtimeState } from '../realtime.enums.js';

export class RealtimeTransitionDto {
  @ApiProperty({
    description: 'Target state to transition to',
    enum: AIRealtimeState,
    example: AIRealtimeState.LISTENING,
  })
  @IsEnum(AIRealtimeState, {
    message: 'state must be a valid AIRealtimeState enum value',
  })
  public state!: AIRealtimeState;
}
