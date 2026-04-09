import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import * as bcrypt from 'bcryptjs';
import { addMonths, getTrialEndsAt } from './subscription.utils';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async create(userData: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
  }): Promise<UserDocument> {
    const passwordHash = await bcrypt.hash(userData.password, 10);
    const newUser = new this.userModel({
      email: userData.email,
      fullName: userData.fullName,
      phone: userData.phone,
      passwordHash,
      trialStartedAt: new Date(),
      trialEndsAt: getTrialEndsAt(),
    });
    return newUser.save();
  }

  async findByEmail(email: string): Promise<UserDocument | undefined> {
    return this.userModel.findOne({ email }).exec();
  }

  async findByEmailWithPassword(email: string): Promise<UserDocument | undefined> {
    return this.userModel
      .findOne({ email })
      .select('+passwordHash +password +resetPasswordTokenHash +resetPasswordTokenExpiresAt')
      .exec();
  }

  async findById(id: string): Promise<UserDocument | undefined> {
    return this.userModel.findById(id).exec();
  }

  async updateProfile(userId: string, dto: { fullName?: string; phone?: string; avatarUrl?: string; avatarPublicId?: string }) {
    return this.userModel
      .findByIdAndUpdate(userId, { $set: dto }, { new: true })
      .exec();
  }

  async updatePasswordHash(userId: string, passwordHash: string) {
    return this.userModel
      .findByIdAndUpdate(userId, { $set: { passwordHash }, $unset: { password: '' } }, { new: true })
      .select('+passwordHash +password')
      .exec();
  }

  async setResetPasswordToken(email: string, tokenHash: string, expiresAt: Date) {
    return this.userModel
      .findOneAndUpdate(
        { email },
        { $set: { resetPasswordTokenHash: tokenHash, resetPasswordTokenExpiresAt: expiresAt } },
        { new: true },
      )
      .select('+resetPasswordTokenHash +resetPasswordTokenExpiresAt')
      .exec();
  }

  async findByResetTokenHash(tokenHash: string): Promise<UserDocument | undefined> {
    return this.userModel
      .findOne({
        resetPasswordTokenHash: tokenHash,
        resetPasswordTokenExpiresAt: { $gt: new Date() },
      })
      .select('+passwordHash +password +resetPasswordTokenHash +resetPasswordTokenExpiresAt')
      .exec();
  }

  async clearResetPasswordToken(userId: string) {
    return this.userModel
      .findByIdAndUpdate(
        userId,
        { $unset: { resetPasswordTokenHash: '', resetPasswordTokenExpiresAt: '' } },
        { new: true },
      )
      .exec();
  }

  async listAllBasicUsers() {
    return this.userModel
      .find({})
      .sort({ createdAt: -1 })
      .select(
        'email fullName role isActive createdAt trialStartedAt trialEndsAt subscriptionStartedAt subscriptionEndsAt subscriptionMonths subscriptionPlanLabel',
      )
      .exec();
  }

  async activateSubscription(input: {
    userId: string;
    months: number;
    planLabel?: string;
    activatedBy: string;
    notes?: string;
  }) {
    const now = new Date();
    const endsAt = addMonths(now, input.months);

    return this.userModel
      .findByIdAndUpdate(
        input.userId,
        {
          $set: {
            subscriptionStartedAt: now,
            subscriptionEndsAt: endsAt,
            subscriptionMonths: input.months,
            subscriptionPlanLabel: input.planLabel?.trim() || `${input.months} month plan`,
            subscriptionActivatedBy: input.activatedBy,
            subscriptionNotes: input.notes?.trim() || undefined,
          },
        },
        { new: true },
      )
      .exec();
  }

  async countActiveSubscriptions(now = new Date()) {
    return this.userModel.countDocuments({
      subscriptionEndsAt: { $gt: now },
    });
  }

  async countExpiringSubscriptions(days: number, now = new Date()) {
    const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return this.userModel.countDocuments({
      subscriptionEndsAt: { $gt: now, $lte: end },
    });
  }

  async countTrialUsers(now = new Date()) {
    return this.userModel.countDocuments({
      trialEndsAt: { $gt: now },
      $or: [{ subscriptionEndsAt: { $exists: false } }, { subscriptionEndsAt: null }, { subscriptionEndsAt: { $lte: now } }],
    });
  }
}
