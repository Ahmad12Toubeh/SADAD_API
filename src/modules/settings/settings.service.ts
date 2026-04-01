import { BadRequestException, Injectable } from '@nestjs/common';
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

@Injectable()
export class SettingsService {
  constructor(
    private readonly usersService: UsersService,
    @InjectModel(StoreSettings.name)
    private readonly storeModel: Model<StoreSettingsDocument>,
    @InjectModel(NotificationSettings.name)
    private readonly notifModel: Model<NotificationSettingsDocument>,
  ) {}

  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);
    return user
      ? {
          id: user._id.toString(),
          email: user.email,
          fullName: user.fullName,
          phone: user.phone ?? null,
          role: user.role,
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
          role: user.role,
        }
      : null;
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
