import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Debt, DebtSchema } from '../debts/schemas/debt.schema';
import { Installment, InstallmentSchema } from '../installments/schemas/installment.schema';
import { GuarantorsController } from './guarantors.controller';
import { GuarantorsService } from './guarantors.service';
import { Guarantor, GuarantorSchema } from './schemas/guarantor.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Guarantor.name, schema: GuarantorSchema },
      { name: Debt.name, schema: DebtSchema },
      { name: Installment.name, schema: InstallmentSchema },
    ]),
  ],
  controllers: [GuarantorsController],
  providers: [GuarantorsService],
  exports: [GuarantorsService],
})
export class GuarantorsModule {}

