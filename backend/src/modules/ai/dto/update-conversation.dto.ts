import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAIConversationDto {
  @ApiProperty({
    description: 'Updated human-readable title for the AI conversation session',
    maxLength: 255,
    example: 'Hydration and Nutrition Goals',
  })
  @IsString({ message: 'title must be a string' })
  @IsNotEmpty({ message: 'title cannot be empty' })
  @MaxLength(255, { message: 'title cannot exceed 255 characters' })
  public title!: string;
}
