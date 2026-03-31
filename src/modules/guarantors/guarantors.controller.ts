import { Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GuarantorsService } from './guarantors.service';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

@ApiTags('Guarantors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class GuarantorsController {
  constructor(private readonly guarantorsService: GuarantorsService) {}

  @Get('guarantors')
  @ApiOperation({ summary: 'List guarantors' })
  @ApiResponse({ status: 200 })
  list(@Req() req: AuthenticatedRequest, @Query('search') search?: string) {
    return this.guarantorsService.list(req.user._id.toString(), search);
  }

  @Post('debts/:id/guarantor/activate')
  @ApiOperation({ summary: 'Activate guarantor for a debt if late installments exist' })
  @ApiResponse({ status: 201 })
  activate(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.guarantorsService.activateIfLate(req.user._id.toString(), id);
  }
}

