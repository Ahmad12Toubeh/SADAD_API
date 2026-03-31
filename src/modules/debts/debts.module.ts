import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomersModule } from '../customers/customers.module';
import { GuarantorsModule } from '../guarantors/guarantors.module';
import { Installment, InstallmentSchema } from '../installments/schemas/installment.schema';
import { DebtsController } from './debts.controller';
import { DebtsService } from './debts.service';
import { Debt, DebtSchema } from './schemas/debt.schema';

@Module({
  imports: [
    forwardRef(() => CustomersModule),
    GuarantorsModule,
    MongooseModule.forFeature([
      { name: Debt.name, schema: DebtSchema },
      { name: Installment.name, schema: InstallmentSchema },
    ]),
  ],
  controllers: [DebtsController],
  providers: [DebtsService],
  exports: [DebtsService],
})
export class DebtsModule {}

