import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SendReminderDto } from './dto/send-reminder.dto';
import { RemindersService } from './reminders.service';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

@ApiTags('Reminders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reminders')
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Get('overdue')
  @ApiOperation({ summary: 'List overdue installments' })
  @ApiResponse({ status: 200 })
  overdue(@Req() req: AuthenticatedRequest) {
    return this.remindersService.overdue(req.user._id.toString());
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'List upcoming installments' })
  @ApiResponse({ status: 200 })
  upcoming(@Req() req: AuthenticatedRequest, @Query('days') days?: string) {
    const n = days ? Number(days) : 7;
    return this.remindersService.upcoming(req.user._id.toString(), Number.isFinite(n) ? n : 7);
  }

  @Get('sent')
  @ApiOperation({ summary: 'List sent reminders' })
  @ApiResponse({ status: 200 })
  sent(@Req() req: AuthenticatedRequest) {
    return this.remindersService.sent(req.user._id.toString());
  }

  @Post('send')
  @ApiOperation({ summary: 'Send a reminder (mock provider) and store log' })
  @ApiResponse({ status: 201 })
  send(@Req() req: AuthenticatedRequest, @Body() dto: SendReminderDto) {
    return this.remindersService.send(req.user._id.toString(), dto);
  }
}

