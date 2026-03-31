import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Debt, DebtSchema } from '../debts/schemas/debt.schema';
import { Installment, InstallmentSchema } from '../installments/schemas/installment.schema';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { Payment, PaymentSchema } from './schemas/payment.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: Installment.name, schema: InstallmentSchema },
      { name: Debt.name, schema: DebtSchema },
    ]),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}

