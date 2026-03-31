import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateAssociationDto } from './dto/create-association.dto';
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
}

