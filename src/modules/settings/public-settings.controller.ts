import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';

@ApiTags('Public Settings')
@Controller('settings')
export class PublicSettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('subscription-plans')
  @ApiOperation({ summary: 'List active public subscription plans' })
  @ApiResponse({ status: 200 })
  listPublicPlans() {
    return this.settingsService.listPublicSubscriptionPlans();
  }
}

