import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { CurrentUser } from '../../doctors/decorators/current-user.decorator.js';
import type { CurrentUserContext } from '../../doctors/interfaces/auth-context.interface.js';
import { PaymentAuthGuard } from '../guards/payment-auth.guard.js';
import { InvoiceService } from '../services/invoice.service.js';
import { InvoiceQueryDto, InvoiceResponseDto } from '../dto/index.js';

@ApiTags('Invoices')
@Controller('invoices')
@UseGuards(PaymentAuthGuard)
@ApiBearerAuth('bearer-auth')
export class InvoicesController {
  public constructor(private readonly invoiceService: InvoiceService) {}

  @Get()
  @ApiOperation({
    summary: 'List finalized invoices scoped to authenticated user',
    description: 'Patients see their invoices; doctors see consultation invoices; admins see all.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of invoices',
  })
  public async getInvoices(
    @CurrentUser() actor: CurrentUserContext,
    @Query() query: InvoiceQueryDto,
  ): Promise<{ items: InvoiceResponseDto[]; total: number }> {
    const { items, total } = await this.invoiceService.getInvoices(query, actor);
    return {
      items: items.map((i) => InvoiceResponseDto.fromEntity(i)),
      total,
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get single invoice by ID, public invoice ID, or invoice number',
    description: 'Enforces strict role-based resource isolation.',
  })
  @ApiParam({
    name: 'id',
    description: 'Internal UUID, public ID (INV-XXXXXXXX) or invoice number (INV-YYYYMM-XXXXXX)',
  })
  @ApiResponse({
    status: 200,
    description: 'Invoice retrieved successfully',
    type: InvoiceResponseDto,
  })
  public async getInvoiceById(
    @CurrentUser() actor: CurrentUserContext,
    @Param('id') id: string,
  ): Promise<InvoiceResponseDto> {
    const invoice = await this.invoiceService.getInvoiceById(id, actor);
    return InvoiceResponseDto.fromEntity(invoice);
  }
}
