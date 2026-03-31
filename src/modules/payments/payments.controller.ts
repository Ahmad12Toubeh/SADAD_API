import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentsService } from './payments.service';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('installments/:id/payments')
  @ApiOperation({ summary: 'Record payment for installment (marks it paid)' })
  @ApiResponse({ status: 201 })
  create(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() dto: CreatePaymentDto) {
    return this.paymentsService.createForInstallment(req.user._id.toString(), id, dto);
  }
}

