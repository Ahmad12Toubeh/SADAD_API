import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { buildSubscriptionSummary } from '../users/subscription.utils';
import {
  SubscriptionNotification,
  SubscriptionNotificationDocument,
  SubscriptionNotificationKind,
} from './schemas/subscription-notification.schema';

type NotificationListItem = {
  id: string;
  kind: SubscriptionNotificationKind;
  targetStage: 'trial' | 'active';
  targetDate: string;
  daysRemainingSnapshot: number;
  subscriptionPlanLabel: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(SubscriptionNotification.name)
    private readonly notificationModel: Model<SubscriptionNotificationDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  @Cron('0 9 * * *', { timeZone: 'Asia/Amman' })
  async processSubscriptionExpiryNotifications() {
    const users = await this.userModel.find({ isActive: true }).exec();
    const now = new Date();

    for (const user of users) {
      try {
        const summary = buildSubscriptionSummary(user, now);
        const notification = this.buildNotificationCandidate(user._id.toString(), summary);
        if (!notification) continue;

        await this.notificationModel.updateOne(
          { ownerUserId: new Types.ObjectId(user._id.toString()), targetKey: notification.targetKey },
          { $setOnInsert: notification },
          { upsert: true },
        );
      } catch (error: any) {
        this.logger.warn(`Subscription notification sweep failed for ${user._id.toString()}: ${error?.message ?? String(error)}`);
      }
    }
  }

  async list(ownerUserId: string, limit = 20) {
    const items = await this.notificationModel
      .find({ ownerUserId: new Types.ObjectId(ownerUserId) })
      .sort({ isRead: 1, createdAt: -1 })
      .limit(Math.max(1, Math.min(limit, 50)))
      .exec();

    return {
      items: items.map((item) => this.toListItem(item)),
    };
  }

  async unreadCount(ownerUserId: string) {
    const count = await this.notificationModel.countDocuments({
      ownerUserId: new Types.ObjectId(ownerUserId),
      isRead: false,
    });
    return { count };
  }

  async markRead(ownerUserId: string, notificationId: string) {
    const updated = await this.notificationModel
      .findOneAndUpdate(
        { _id: notificationId, ownerUserId: new Types.ObjectId(ownerUserId) },
        { $set: { isRead: true, readAt: new Date() } },
        { new: true },
      )
      .exec();

    return updated ? this.toListItem(updated) : null;
  }

  async markAllRead(ownerUserId: string) {
    await this.notificationModel.updateMany(
      { ownerUserId: new Types.ObjectId(ownerUserId), isRead: false },
      { $set: { isRead: true, readAt: new Date() } },
    );
    return { ok: true };
  }

  private buildNotificationCandidate(ownerUserId: string, summary: ReturnType<typeof buildSubscriptionSummary>) {
    if (summary.stage === 'trial' && summary.daysRemaining > 0 && summary.daysRemaining <= 1 && summary.trialEndsAt) {
      return {
        ownerUserId: new Types.ObjectId(ownerUserId),
        kind: 'trial_expiring' as const,
        targetStage: 'trial' as const,
        targetKey: `trial:${summary.trialEndsAt.toISOString()}`,
        targetDate: summary.trialEndsAt,
        daysRemainingSnapshot: summary.daysRemaining,
        subscriptionPlanLabel: summary.subscriptionPlanLabel ?? undefined,
        isRead: false,
      };
    }

    if (summary.stage === 'active' && summary.daysRemaining > 0 && summary.daysRemaining <= 3 && summary.subscriptionEndsAt) {
      return {
        ownerUserId: new Types.ObjectId(ownerUserId),
        kind: 'subscription_expiring' as const,
        targetStage: 'active' as const,
        targetKey: `active:${summary.subscriptionEndsAt.toISOString()}`,
        targetDate: summary.subscriptionEndsAt,
        daysRemainingSnapshot: summary.daysRemaining,
        subscriptionPlanLabel: summary.subscriptionPlanLabel ?? undefined,
        isRead: false,
      };
    }

    return null;
  }

  private toListItem(item: SubscriptionNotificationDocument): NotificationListItem {
    return {
      id: item._id.toString(),
      kind: item.kind,
      targetStage: item.targetStage,
      targetDate: item.targetDate.toISOString(),
      daysRemainingSnapshot: item.daysRemainingSnapshot,
      subscriptionPlanLabel: item.subscriptionPlanLabel ?? null,
      isRead: item.isRead,
      readAt: item.readAt ? item.readAt.toISOString() : null,
      createdAt: (item as any).createdAt?.toISOString?.() ?? new Date().toISOString(),
      updatedAt: (item as any).updatedAt?.toISOString?.() ?? new Date().toISOString(),
    };
  }
}
