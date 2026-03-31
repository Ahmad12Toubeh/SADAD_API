import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Customer, CustomerSchema } from '../customers/schemas/customer.schema';
import { Debt, DebtSchema } from '../debts/schemas/debt.schema';
import { Installment, InstallmentSchema } from '../installments/schemas/installment.schema';
import { Payment, PaymentSchema } from '../payments/schemas/payment.schema';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Debt.name, schema: DebtSchema },
      { name: Installment.name, schema: InstallmentSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: Customer.name, schema: CustomerSchema },
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}

