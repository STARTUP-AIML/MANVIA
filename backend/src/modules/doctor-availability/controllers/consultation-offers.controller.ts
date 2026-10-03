import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DoctorAuthGuard } from '../../doctors/guards/doctor-auth.guard.js';
import { CurrentUser } from '../../doctors/decorators/current-user.decorator.js';
import type { CurrentUserContext } from '../../doctors/interfaces/auth-context.interface.js';
import { ConsultationOffersService } from '../services/consultation-offers.service.js';
import { CreateConsultationOfferDto } from '../dto/create-consultation-offer.dto.js';
import { UpdateConsultationOfferDto } from '../dto/update-consultation-offer.dto.js';
import { ConsultationOfferResponseDto } from '../dto/consultation-offer-response.dto.js';

@ApiTags('Consultation Offers')
@Controller('doctors/me/consultation-offers')
@UseGuards(DoctorAuthGuard)
@ApiBearerAuth('bearer-auth')
export class ConsultationOffersController {
  constructor(private readonly offersService: ConsultationOffersService) {}

  @Get()
  @ApiOperation({
    summary: 'List consultation offers for authenticated physician',
    description:
      'Returns all consultation offers (including active, draft, and inactive) configured by the physician.',
  })
  @ApiResponse({
    status: 200,
    description: 'Consultation offers retrieved successfully',
    type: [ConsultationOfferResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Doctor role required' })
  @ApiResponse({ status: 404, description: 'Doctor profile not found' })
  public async getSelfOffers(
    @CurrentUser() user: CurrentUserContext,
  ): Promise<ConsultationOfferResponseDto[]> {
    return this.offersService.getSelfOffers(user.userId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new consultation offer',
    description:
      'Defines a structured consultation offer specifying clinical service title, type, duration in minutes, and pricing metadata.',
  })
  @ApiResponse({
    status: 201,
    description: 'Consultation offer created successfully',
    type: ConsultationOfferResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation failed on duration, fee, or currency' })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Doctor role required' })
  @ApiResponse({ status: 409, description: 'Duplicate active consultation offer exists' })
  public async createOffer(
    @CurrentUser() user: CurrentUserContext,
    @Body() dto: CreateConsultationOfferDto,
  ): Promise<ConsultationOfferResponseDto> {
    return this.offersService.createOffer(user.userId, dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update existing consultation offer',
    description:
      'Modifies service title, description, duration, pricing metadata, or active lifecycle status.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the consultation offer' })
  @ApiResponse({
    status: 200,
    description: 'Consultation offer updated successfully',
    type: ConsultationOfferResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation failed on fee or duration' })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Access denied: cannot modify another physician offer' })
  @ApiResponse({ status: 404, description: 'Consultation offer not found' })
  public async updateOffer(
    @CurrentUser() user: CurrentUserContext,
    @Param('id') id: string,
    @Body() dto: UpdateConsultationOfferDto,
  ): Promise<ConsultationOfferResponseDto> {
    return this.offersService.updateOffer(user.userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete or deactivate consultation offer',
    description: 'Removes a consultation offer from the physician active catalog.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the consultation offer to delete' })
  @ApiResponse({
    status: 200,
    description: 'Consultation offer deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        id: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Access denied: cannot delete another physician offer' })
  @ApiResponse({ status: 404, description: 'Consultation offer not found' })
  public async deleteOffer(
    @CurrentUser() user: CurrentUserContext,
    @Param('id') id: string,
  ): Promise<{ success: boolean; id: string }> {
    return this.offersService.deleteOffer(user.userId, id);
  }
}
