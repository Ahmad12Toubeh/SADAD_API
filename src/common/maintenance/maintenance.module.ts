import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Debt, DebtSchema } from '../../modules/debts/schemas/debt.schema';
import { Installment, InstallmentSchema } from '../../modules/installments/schemas/installment.schema';
import { LateInstallmentsService } from './late-installments.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Debt.name, schema: DebtSchema },
      { name: Installment.name, schema: InstallmentSchema },
    ]),
  ],
  providers: [LateInstallmentsService],
})
export class MaintenanceModule {}
