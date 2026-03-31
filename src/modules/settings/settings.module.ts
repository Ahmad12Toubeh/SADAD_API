import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from '../users/users.module';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { NotificationSettings, NotificationSettingsSchema } from './schemas/notification-settings.schema';
import { StoreSettings, StoreSettingsSchema } from './schemas/store-settings.schema';

@Module({
  imports: [
    UsersModule,
    MongooseModule.forFeature([
      { name: StoreSettings.name, schema: StoreSettingsSchema },
      { name: NotificationSettings.name, schema: NotificationSettingsSchema },
    ]),
  ],
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}

