import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Health Check')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @ApiOperation({ summary: 'Check API Status' })
  @ApiResponse({ status: 200, description: 'API is healthy' })
  getHello(): string {
    return this.appService.getHello();
  }
}
