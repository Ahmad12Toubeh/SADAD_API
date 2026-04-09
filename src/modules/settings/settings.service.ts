import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateStoreSettingsDto } from './dto/update-store-settings.dto';
import { NotificationSettings, NotificationSettingsDocument } from './schemas/notification-settings.schema';
import { StoreSettings, StoreSettingsDocument } from './schemas/store-settings.schema';
import { ActivateSubscriptionDto } from './dto/activate-subscription.dto';
import { buildSubscriptionSummary } from '../users/subscription.utils';
import { SubscriptionPlan, SubscriptionPlanDocument } from './schemas/subscription-plan.schema';
import { Payment, PaymentDocument } from '../payments/schemas/payment.schema';
import { Customer, CustomerDocument } from '../customers/schemas/customer.schema';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';
import { AssignPlanSubscriptionDto } from './dto/assign-plan-subscription.dto';

@Injectable()
export class SettingsService {
  constructor(
    private readonly usersService: UsersService,
    @InjectModel(StoreSettings.name)
    private readonly storeModel: Model<StoreSettingsDocument>,
    @InjectModel(NotificationSettings.name)
    private readonly notifModel: Model<NotificationSettingsDocument>,
    @InjectModel(SubscriptionPlan.name)
    private readonly subscriptionPlanModel: Model<SubscriptionPlanDocument>,
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(Customer.name)
    private readonly customerModel: Model<CustomerDocument>,
  ) {}

  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);
    return user
      ? {
          id: user._id.toString(),
          email: user.email,
          fullName: user.fullName,
          phone: user.phone ?? null,
          avatarUrl: user.avatarUrl ?? null,
          avatarPublicId: user.avatarPublicId ?? null,
          role: user.role,
          subscription: buildSubscriptionSummary(user),
        }
      : null;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.usersService.updateProfile(userId, dto);
    return user
      ? {
          id: user._id.toString(),
          email: user.email,
          fullName: user.fullName,
          phone: user.phone ?? null,
          avatarUrl: user.avatarUrl ?? null,
          avatarPublicId: user.avatarPublicId ?? null,
          role: user.role,
          subscription: buildSubscriptionSummary(user),
        }
      : null;
  }

  async getSubscription(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return buildSubscriptionSummary(user);
  }

  async listUsersForSubscriptionAdmin() {
    const users = await this.usersService.listAllBasicUsers();
    return users.map((user) => ({
      id: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      subscription: buildSubscriptionSummary(user),
    }));
  }

  async getOwnerOverview() {
    const now = new Date();
    const [customersCount, paymentsAgg, activeSubscriptions, expiringSoon, trialUsers] = await Promise.all([
      this.customerModel.countDocuments({}),
      this.paymentModel.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]).exec(),
      this.usersService.countActiveSubscriptions(now),
      this.usersService.countExpiringSubscriptions(7, now),
      this.usersService.countTrialUsers(now),
    ]);

    return {
      customersCount,
      totalCollected: paymentsAgg?.[0]?.total ?? 0,
      activeSubscriptions,
      expiringSoon,
      trialUsers,
      currency: 'JOD',
    };
  }

  async listSubscriptionPlans() {
    const plans = await this.subscriptionPlanModel.find({}).sort({ createdAt: -1 }).exec();
    return plans.map((plan) => ({
      id: plan._id.toString(),
      name: plan.name,
      months: plan.months,
      price: plan.price,
      currency: plan.currency,
      description: plan.description ?? null,
      isActive: plan.isActive,
      createdBy: plan.createdBy ?? null,
    }));
  }

  async listPublicSubscriptionPlans() {
    const plans = await this.subscriptionPlanModel
      .find({ isActive: true })
      .sort({ price: 1, months: 1, createdAt: -1 })
      .exec();
    return plans.map((plan) => ({
      id: plan._id.toString(),
      name: plan.name,
      months: plan.months,
      price: plan.price,
      currency: plan.currency,
      description: plan.description ?? null,
      isActive: plan.isActive,
      createdBy: plan.createdBy ?? null,
    }));
  }

  async createSubscriptionPlan(dto: CreateSubscriptionPlanDto, createdBy: string) {
    const plan = await this.subscriptionPlanModel.create({
      name: dto.name.trim(),
      months: dto.months,
      price: dto.price,
      currency: dto.currency?.trim() || 'JOD',
      description: dto.description?.trim() || undefined,
      isActive: dto.isActive ?? true,
      createdBy,
    });
    return {
      id: plan._id.toString(),
      name: plan.name,
      months: plan.months,
      price: plan.price,
      currency: plan.currency,
      description: plan.description ?? null,
      isActive: plan.isActive,
      createdBy: plan.createdBy ?? null,
    };
  }

  async updateSubscriptionPlan(planId: string, dto: UpdateSubscriptionPlanDto) {
    const plan = await this.subscriptionPlanModel
      .findByIdAndUpdate(
        planId,
        {
          $set: {
            ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
            ...(dto.months !== undefined ? { months: dto.months } : {}),
            ...(dto.price !== undefined ? { price: dto.price } : {}),
            ...(dto.currency !== undefined ? { currency: dto.currency.trim() || 'JOD' } : {}),
            ...(dto.description !== undefined ? { description: dto.description.trim() || null } : {}),
            ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          },
        },
        { new: true },
      )
      .exec();

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    return {
      id: plan._id.toString(),
      name: plan.name,
      months: plan.months,
      price: plan.price,
      currency: plan.currency,
      description: plan.description ?? null,
      isActive: plan.isActive,
      createdBy: plan.createdBy ?? null,
    };
  }

  async assignSubscriptionFromPlan(dto: AssignPlanSubscriptionDto, activatedBy: string) {
    const plan = await this.subscriptionPlanModel.findById(dto.planId).exec();
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    const user = await this.usersService.activateSubscription({
      userId: dto.userId,
      months: plan.months,
      planLabel: plan.name,
      notes: dto.notes,
      activatedBy,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      plan: {
        id: plan._id.toString(),
        name: plan.name,
        months: plan.months,
        price: plan.price,
        currency: plan.currency,
      },
      subscription: buildSubscriptionSummary(user),
    };
  }

  async activateSubscription(activatedBy: string, dto: ActivateSubscriptionDto) {
    const user = await this.usersService.activateSubscription({
      userId: dto.userId,
      months: dto.months,
      planLabel: dto.planLabel,
      notes: dto.notes,
      activatedBy,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      subscription: buildSubscriptionSummary(user),
    };
  }

  async getStore(ownerUserId: string) {
    const doc = await this.storeModel.findOne({ ownerUserId: new Types.ObjectId(ownerUserId) }).exec();
    if (!doc) {
      return {
        currency: 'JOD',
        storeName: null,
        businessType: null,
        address: null,
        cr: null,
      };
    }
    return {
      currency: doc.currency,
      storeName: doc.storeName ?? null,
      businessType: doc.businessType ?? null,
      address: doc.address ?? null,
      cr: doc.cr ?? null,
    };
  }

  async updateStore(ownerUserId: string, dto: UpdateStoreSettingsDto) {
    const doc = await this.storeModel.findOneAndUpdate(
      { ownerUserId: new Types.ObjectId(ownerUserId) },
      { $set: { ...dto }, $setOnInsert: { currency: dto.currency ?? 'JOD' } },
      { upsert: true, new: true },
    );
    return {
      currency: doc.currency,
      storeName: doc.storeName ?? null,
      businessType: doc.businessType ?? null,
      address: doc.address ?? null,
      cr: doc.cr ?? null,
    };
  }

  async getNotifications(ownerUserId: string) {
    const doc = await this.notifModel.findOne({ ownerUserId: new Types.ObjectId(ownerUserId) }).exec();
    if (!doc) {
      return {
        remindOnDelay: true,
        remindBeforeDue: true,
        weeklySummary: false,
        whatsappEnabled: true,
        customWhatsappNumber: null,
      };
    }
    return {
      remindOnDelay: doc.remindOnDelay,
      remindBeforeDue: doc.remindBeforeDue,
      weeklySummary: doc.weeklySummary,
      whatsappEnabled: doc.whatsappEnabled,
      customWhatsappNumber: doc.customWhatsappNumber ?? null,
    };
  }

  async updateNotifications(ownerUserId: string, dto: UpdateNotificationSettingsDto) {
    const doc = await this.notifModel.findOneAndUpdate(
      { ownerUserId: new Types.ObjectId(ownerUserId) },
      {
        $set: {
          ...dto,
        },
        $setOnInsert: {
          remindOnDelay: true,
          remindBeforeDue: true,
          weeklySummary: false,
          whatsappEnabled: true,
        },
      },
      { upsert: true, new: true },
    );

    return {
      remindOnDelay: doc.remindOnDelay,
      remindBeforeDue: doc.remindBeforeDue,
      weeklySummary: doc.weeklySummary,
      whatsappEnabled: doc.whatsappEnabled,
      customWhatsappNumber: doc.customWhatsappNumber ?? null,
    };
  }

  async changePassword(ownerUserId: string, dto: ChangePasswordDto) {
    const profile = await this.usersService.findById(ownerUserId);
    if (!profile) throw new BadRequestException('User not found');

    const user = await this.usersService.findByEmailWithPassword(profile.email);
    if (!user) throw new BadRequestException('User not found');

    const passwordHash = user.passwordHash ?? user.password;
    if (!passwordHash) throw new BadRequestException('Password not set');

    const ok = await bcrypt.compare(dto.currentPassword, passwordHash);
    if (!ok) throw new BadRequestException('Current password is incorrect');

    const newHash = await bcrypt.hash(dto.newPassword, 10);
    await this.usersService.updatePasswordHash(ownerUserId, newHash);

    return { ok: true };
  }
}
