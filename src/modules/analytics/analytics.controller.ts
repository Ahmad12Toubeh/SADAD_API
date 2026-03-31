import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Analytics summary' })
  @ApiResponse({ status: 200 })
  summary(@Req() req: any) {
    return this.analyticsService.summary(req.user._id.toString());
  }

  @Get('monthly')
  @ApiOperation({ summary: 'Monthly analytics (debts vs collected)' })
  @ApiResponse({ status: 200 })
  monthly(@Req() req: any, @Query('months') months?: string) {
    const n = months ? Number(months) : 6;
    return this.analyticsService.monthly(req.user._id.toString(), Number.isFinite(n) ? n : 6);
  }
}

