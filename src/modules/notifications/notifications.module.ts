import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from '../users/users.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import {
  SubscriptionNotification,
  SubscriptionNotificationSchema,
} from './schemas/subscription-notification.schema';

@Module({
  imports: [
    UsersModule,
    MongooseModule.forFeature([
      { name: SubscriptionNotification.name, schema: SubscriptionNotificationSchema },
    ]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
