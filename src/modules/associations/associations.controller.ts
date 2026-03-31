import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateAssociationDto } from './dto/create-association.dto';
import { UpdateAssociationDto } from './dto/update-association.dto';
import { AssociationsService } from './associations.service';

@ApiTags('Associations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('associations')
export class AssociationsController {
  constructor(private readonly associationsService: AssociationsService) {}

  @Get()
  @ApiOperation({ summary: 'List associations' })
  @ApiResponse({ status: 200 })
  list(@Req() req: any) {
    return this.associationsService.list(req.user._id.toString());
  }

  @Post()
  @ApiOperation({ summary: 'Create association' })
  @ApiResponse({ status: 201 })
  create(@Req() req: any, @Body() dto: CreateAssociationDto) {
    return this.associationsService.create(req.user._id.toString(), dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get association' })
  @ApiResponse({ status: 200 })
  get(@Req() req: any, @Param('id') id: string) {
    return this.associationsService.get(req.user._id.toString(), id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update association' })
  @ApiResponse({ status: 200 })
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateAssociationDto) {
    return this.associationsService.update(req.user._id.toString(), id, dto);
  }
}

