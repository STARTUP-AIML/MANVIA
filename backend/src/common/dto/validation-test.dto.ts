import { IsString, IsEmail, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Infrastructure DTO specifically used for verifying validation pipe behavior,
 * unknown property rejection, and implicit/explicit type transformation.
 * Note: Domain DTOs belong strictly to future domain phases.
 */
export class ValidationTestDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  @Type(() => Number)
  age?: number;
}
