import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Customer, CustomerSchema } from '../customers/schemas/customer.schema';
import { Debt, DebtSchema } from '../debts/schemas/debt.schema';
import { Installment, InstallmentSchema } from '../installments/schemas/installment.schema';
import { SettingsModule } from '../settings/settings.module';
import { User, UserSchema } from '../users/schemas/user.schema';
import { RemindersController } from './reminders.controller';
import { RemindersService } from './reminders.service';
import { Reminder, ReminderSchema } from './schemas/reminder.schema';

@Module({
  imports: [
    ConfigModule,
    SettingsModule,
    MongooseModule.forFeature([
      { name: Reminder.name, schema: ReminderSchema },
      { name: Installment.name, schema: InstallmentSchema },
      { name: Debt.name, schema: DebtSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [RemindersController],
  providers: [RemindersService],
})
export class RemindersModule {}
