import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from '../users/users.module';
import { SettingsController } from './settings.controller';
import { PublicSettingsController } from './public-settings.controller';
import { SettingsService } from './settings.service';
import { NotificationSettings, NotificationSettingsSchema } from './schemas/notification-settings.schema';
import { StoreSettings, StoreSettingsSchema } from './schemas/store-settings.schema';
import { SubscriptionPlan, SubscriptionPlanSchema } from './schemas/subscription-plan.schema';
import { Payment, PaymentSchema } from '../payments/schemas/payment.schema';
import { Customer, CustomerSchema } from '../customers/schemas/customer.schema';

@Module({
  imports: [
    UsersModule,
    MongooseModule.forFeature([
      { name: StoreSettings.name, schema: StoreSettingsSchema },
      { name: NotificationSettings.name, schema: NotificationSettingsSchema },
      { name: SubscriptionPlan.name, schema: SubscriptionPlanSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: Customer.name, schema: CustomerSchema },
    ]),
  ],
  controllers: [SettingsController, PublicSettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
