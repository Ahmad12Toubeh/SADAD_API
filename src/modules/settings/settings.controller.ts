import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateStoreSettingsDto } from './dto/update-store-settings.dto';
import { SettingsService } from './settings.service';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';
import { ActivateSubscriptionDto } from './dto/activate-subscription.dto';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';
import { AssignPlanSubscriptionDto } from './dto/assign-plan-subscription.dto';

function assertAdminRole(req: AuthenticatedRequest) {
  if (req.user.role !== 'admin' && req.user.role !== 'owner') {
    throw new ForbiddenException({
      message: 'Only admins can access this action',
      code: 'SUBSCRIPTION_ADMIN_ONLY',
      messageKey: 'errors.common.badRequest',
    });
  }
}

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get profile settings' })
  @ApiResponse({ status: 200 })
  getProfile(@Req() req: AuthenticatedRequest) {
    return this.settingsService.getProfile(req.user._id.toString());
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update profile settings' })
  @ApiResponse({ status: 200 })
  updateProfile(@Req() req: AuthenticatedRequest, @Body() dto: UpdateProfileDto) {
    return this.settingsService.updateProfile(req.user._id.toString(), dto);
  }

  @Get('store')
  @ApiOperation({ summary: 'Get store settings' })
  @ApiResponse({ status: 200 })
  getStore(@Req() req: AuthenticatedRequest) {
    return this.settingsService.getStore(req.user._id.toString());
  }

  @Patch('store')
  @ApiOperation({ summary: 'Update store settings' })
  @ApiResponse({ status: 200 })
  updateStore(@Req() req: AuthenticatedRequest, @Body() dto: UpdateStoreSettingsDto) {
    return this.settingsService.updateStore(req.user._id.toString(), dto);
  }

  @Get('notifications')
  @ApiOperation({ summary: 'Get notification settings' })
  @ApiResponse({ status: 200 })
  getNotifications(@Req() req: AuthenticatedRequest) {
    return this.settingsService.getNotifications(req.user._id.toString());
  }

  @Patch('notifications')
  @ApiOperation({ summary: 'Update notification settings' })
  @ApiResponse({ status: 200 })
  updateNotifications(@Req() req: AuthenticatedRequest, @Body() dto: UpdateNotificationSettingsDto) {
    return this.settingsService.updateNotifications(req.user._id.toString(), dto);
  }

  @Patch('security/password')
  @ApiOperation({ summary: 'Change password' })
  @ApiResponse({ status: 200 })
  changePassword(@Req() req: AuthenticatedRequest, @Body() dto: ChangePasswordDto) {
    return this.settingsService.changePassword(req.user._id.toString(), dto);
  }

  @Get('subscription')
  @ApiOperation({ summary: 'Get current account subscription/trial status' })
  @ApiResponse({ status: 200 })
  getSubscription(@Req() req: AuthenticatedRequest) {
    return this.settingsService.getSubscription(req.user._id.toString());
  }

  @Patch('subscription/admin')
  @ApiOperation({ summary: 'Activate or renew a paid subscription for a user' })
  @ApiResponse({ status: 200 })
  activateSubscription(@Req() req: AuthenticatedRequest, @Body() dto: ActivateSubscriptionDto) {
    assertAdminRole(req);

    return this.settingsService.activateSubscription(req.user.email, dto);
  }

  @Get('subscription/admin/users')
  @ApiOperation({ summary: 'List users for manual subscription activation' })
  @ApiResponse({ status: 200 })
  listSubscriptionUsers(@Req() req: AuthenticatedRequest) {
    assertAdminRole(req);
    return this.settingsService.listUsersForSubscriptionAdmin();
  }

  @Get('owner/overview')
  @ApiOperation({ summary: 'Owner dashboard analytics overview' })
  @ApiResponse({ status: 200 })
  getOwnerOverview(@Req() req: AuthenticatedRequest) {
    assertAdminRole(req);
    return this.settingsService.getOwnerOverview();
  }

  @Get('owner/plans')
  @ApiOperation({ summary: 'List subscription plans' })
  @ApiResponse({ status: 200 })
  listOwnerPlans(@Req() req: AuthenticatedRequest) {
    assertAdminRole(req);
    return this.settingsService.listSubscriptionPlans();
  }

  @Post('owner/plans')
  @ApiOperation({ summary: 'Create subscription plan' })
  @ApiResponse({ status: 201 })
  createOwnerPlan(@Req() req: AuthenticatedRequest, @Body() dto: CreateSubscriptionPlanDto) {
    assertAdminRole(req);
    return this.settingsService.createSubscriptionPlan(dto, req.user.email);
  }

  @Patch('owner/plans/:id')
  @ApiOperation({ summary: 'Update subscription plan' })
  @ApiResponse({ status: 200 })
  updateOwnerPlan(@Req() req: AuthenticatedRequest, @Body() dto: UpdateSubscriptionPlanDto, @Param('id') id: string) {
    assertAdminRole(req);
    return this.settingsService.updateSubscriptionPlan(id, dto);
  }

  @Post('owner/assign-subscription')
  @ApiOperation({ summary: 'Assign plan-based subscription to a customer account' })
  @ApiResponse({ status: 200 })
  assignOwnerSubscription(@Req() req: AuthenticatedRequest, @Body() dto: AssignPlanSubscriptionDto) {
    assertAdminRole(req);
    return this.settingsService.assignSubscriptionFromPlan(dto, req.user.email);
  }
}
