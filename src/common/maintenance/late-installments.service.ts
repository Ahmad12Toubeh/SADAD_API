import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Installment, InstallmentDocument } from '../../modules/installments/schemas/installment.schema';
import { Debt, DebtDocument } from '../../modules/debts/schemas/debt.schema';

@Injectable()
export class LateInstallmentsService {
  private readonly logger = new Logger(LateInstallmentsService.name);

  constructor(
    @InjectModel(Installment.name)
    private readonly installmentModel: Model<InstallmentDocument>,
    @InjectModel(Debt.name)
    private readonly debtModel: Model<DebtDocument>,
  ) {}

  // Runs every 15 minutes.
  @Cron('*/15 * * * *')
  async markLateInstallments() {
    const now = new Date();

    const overdue = await this.installmentModel
      .find({
        status: { $nin: ['paid', 'late'] },
        dueDate: { $lt: now },
      })
      .select('_id debtId ownerUserId')
      .limit(500)
      .exec();

    if (overdue.length === 0) return;

    const ids = overdue.map((i) => i._id);
    await this.installmentModel.updateMany(
      { _id: { $in: ids } },
      { $set: { status: 'late' } },
    );

    const debtIds = Array.from(new Set(overdue.map((i) => i.debtId.toString())));
    for (const debtId of debtIds) {
      await this.recomputeDebtStatus(debtId);
    }

    this.logger.log(`Marked ${ids.length} installments as late across ${debtIds.length} debts.`);
  }

  private async recomputeDebtStatus(debtId: string) {
    const debt = await this.debtModel.findOne({ _id: new Types.ObjectId(debtId) });
    if (!debt) return;

    const installments = await this.installmentModel.find({ debtId: debt._id }).exec();
    const allPaid = installments.length > 0 && installments.every((i) => i.status === 'paid');
    if (allPaid) {
      debt.status = 'paid';
      await debt.save();
      return;
    }

    const anyLate = installments.some((i) => i.status === 'late');
    debt.status = anyLate ? 'late' : 'active';
    await debt.save();
  }
}
