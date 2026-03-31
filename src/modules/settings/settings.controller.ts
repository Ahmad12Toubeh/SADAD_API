import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateStoreSettingsDto } from './dto/update-store-settings.dto';
import { SettingsService } from './settings.service';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get profile settings' })
  @ApiResponse({ status: 200 })
  getProfile(@Req() req: any) {
    return this.settingsService.getProfile(req.user._id.toString());
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update profile settings' })
  @ApiResponse({ status: 200 })
  updateProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
    return this.settingsService.updateProfile(req.user._id.toString(), dto);
  }

  @Get('store')
  @ApiOperation({ summary: 'Get store settings' })
  @ApiResponse({ status: 200 })
  getStore(@Req() req: any) {
    return this.settingsService.getStore(req.user._id.toString());
  }

  @Patch('store')
  @ApiOperation({ summary: 'Update store settings' })
  @ApiResponse({ status: 200 })
  updateStore(@Req() req: any, @Body() dto: UpdateStoreSettingsDto) {
    return this.settingsService.updateStore(req.user._id.toString(), dto);
  }

  @Get('notifications')
  @ApiOperation({ summary: 'Get notification settings' })
  @ApiResponse({ status: 200 })
  getNotifications(@Req() req: any) {
    return this.settingsService.getNotifications(req.user._id.toString());
  }

  @Patch('notifications')
  @ApiOperation({ summary: 'Update notification settings' })
  @ApiResponse({ status: 200 })
  updateNotifications(@Req() req: any, @Body() dto: UpdateNotificationSettingsDto) {
    return this.settingsService.updateNotifications(req.user._id.toString(), dto);
  }

  @Patch('security/password')
  @ApiOperation({ summary: 'Change password' })
  @ApiResponse({ status: 200 })
  changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
    return this.settingsService.changePassword(req.user._id.toString(), dto);
  }
}

