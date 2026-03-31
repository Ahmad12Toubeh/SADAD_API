import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { CustomersModule } from './modules/customers/customers.module';
import { DebtsModule } from './modules/debts/debts.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { GuarantorsModule } from './modules/guarantors/guarantors.module';
import { RemindersModule } from './modules/reminders/reminders.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { SettingsModule } from './modules/settings/settings.module';
import { AssociationsModule } from './modules/associations/associations.module';

@Module({
  imports: [
    // Configure environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Rate Limiting
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),

    // Connect to MongoDB using URI from .env
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const uri = configService.get<string>('MONGODB_URI');
        return {
          uri,
        };
      },
      inject: [ConfigService],
    }),

    // Features
    UsersModule,
    AuthModule,
    CustomersModule,
    DebtsModule,
    PaymentsModule,
    GuarantorsModule,
    RemindersModule,
    AnalyticsModule,
    SettingsModule,
    AssociationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
