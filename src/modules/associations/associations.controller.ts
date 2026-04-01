import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateAssociationDto } from './dto/create-association.dto';
import { ApproveFundTransactionDto, FundTransactionDto } from './dto/fund-transaction.dto';
import { UpdateAssociationDto } from './dto/update-association.dto';
import { AssociationsService } from './associations.service';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

@ApiTags('Associations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('associations')
export class AssociationsController {
  constructor(private readonly associationsService: AssociationsService) {}

  @Get()
  @ApiOperation({ summary: 'List associations' })
  @ApiResponse({ status: 200 })
  list(@Req() req: AuthenticatedRequest) {
    return this.associationsService.list(req.user._id.toString());
  }

  @Post()
  @ApiOperation({ summary: 'Create association' })
  @ApiResponse({ status: 201 })
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateAssociationDto) {
    return this.associationsService.create(req.user._id.toString(), dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get association' })
  @ApiResponse({ status: 200 })
  get(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.associationsService.get(req.user._id.toString(), id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update association' })
  @ApiResponse({ status: 200 })
  update(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() dto: UpdateAssociationDto) {
    return this.associationsService.update(req.user._id.toString(), id, dto);
  }

  @Post(':id/close-month')
  @ApiOperation({ summary: 'Close month and advance cycle' })
  @ApiResponse({ status: 200 })
  closeMonth(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.associationsService.closeMonth(req.user._id.toString(), id);
  }

  @Post(':id/fund-transaction')
  @ApiOperation({ summary: 'Add fund transaction (family fund)' })
  @ApiResponse({ status: 200 })
  addFundTransaction(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() dto: FundTransactionDto) {
    return this.associationsService.addFundTransaction(req.user._id.toString(), id, dto);
  }

  @Post(':id/fund-transaction/approve')
  @ApiOperation({ summary: 'Approve fund transaction (requires 2 approvals)' })
  @ApiResponse({ status: 200 })
  approveFundTransaction(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: ApproveFundTransactionDto,
  ) {
    return this.associationsService.approveFundTransaction(req.user._id.toString(), id, dto);
  }

  @Post(':id/reopen-cycle')
  @ApiOperation({ summary: 'Reopen cycle (unlock order)' })
  @ApiResponse({ status: 200 })
  reopenCycle(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.associationsService.reopenCycle(req.user._id.toString(), id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete association' })
  @ApiResponse({ status: 200 })
  remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.associationsService.remove(req.user._id.toString(), id);
  }
}
