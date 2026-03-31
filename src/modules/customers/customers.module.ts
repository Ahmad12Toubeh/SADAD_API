import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DebtsModule } from '../debts/debts.module';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { Customer, CustomerSchema } from './schemas/customer.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Customer.name, schema: CustomerSchema }]),
    forwardRef(() => DebtsModule),
  ],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}

