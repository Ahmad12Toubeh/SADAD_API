import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DebtsService } from '../debts/debts.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { QueryCustomersDto } from './dto/query-customers.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomersService } from './customers.service';

@ApiTags('Customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(
    private readonly customersService: CustomersService,
    private readonly debtsService: DebtsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create customer' })
  @ApiResponse({ status: 201 })
  create(@Req() req: any, @Body() dto: CreateCustomerDto) {
    return this.customersService.create(req.user._id.toString(), dto);
  }

  @Get()
  @ApiOperation({ summary: 'List customers (search/pagination)' })
  @ApiResponse({ status: 200 })
  findAll(@Req() req: any, @Query() query: QueryCustomersDto) {
    return this.customersService.findAll(req.user._id.toString(), query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer by id' })
  @ApiResponse({ status: 200 })
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.customersService.findOne(req.user._id.toString(), id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update customer' })
  @ApiResponse({ status: 200 })
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customersService.update(req.user._id.toString(), id, dto);
  }

  @Get(':id/debts')
  @ApiOperation({ summary: 'List customer debts' })
  @ApiResponse({ status: 200 })
  debts(@Req() req: any, @Param('id') id: string) {
    return this.debtsService.listByCustomer(req.user._id.toString(), id);
  }
}

