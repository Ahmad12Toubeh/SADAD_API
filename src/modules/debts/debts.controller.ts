import { Body, Controller, Delete, Get, Param, Patch, Post, Req, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateDebtDto } from './dto/create-debt.dto';
import { UpdateDebtDto } from './dto/update-debt.dto';
import { DebtsService } from './debts.service';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

@ApiTags('Debts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('debts')
export class DebtsController {
  constructor(private readonly debtsService: DebtsService) {}

  @Post()
  @ApiOperation({ summary: 'Create debt (one-time or installments)' })
  @ApiResponse({ status: 201 })
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateDebtDto) {
    return this.debtsService.create(req.user._id.toString(), dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all debts' })
  @ApiResponse({ status: 200 })
  findAll(@Req() req: AuthenticatedRequest, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.debtsService.findAll(req.user._id.toString(), { page: page ? Number(page) : undefined, limit: limit ? Number(limit) : undefined });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get debt details' })
  @ApiResponse({ status: 200 })
  findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.debtsService.findOne(req.user._id.toString(), id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update debt' })
  @ApiResponse({ status: 200 })
  update(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() dto: UpdateDebtDto) {
    return this.debtsService.update(req.user._id.toString(), id, dto);
  }

  @Get(':id/installments')
  @ApiOperation({ summary: 'List installments for debt' })
  @ApiResponse({ status: 200 })
  installments(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.debtsService.listInstallments(req.user._id.toString(), id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete debt' })
  @ApiResponse({ status: 200 })
  delete(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.debtsService.delete(req.user._id.toString(), id);
  }
}

