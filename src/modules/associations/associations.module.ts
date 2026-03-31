import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AssociationsController } from './associations.controller';
import { AssociationsService } from './associations.service';
import { Association, AssociationSchema } from './schemas/association.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Association.name, schema: AssociationSchema },
    ]),
  ],
  controllers: [AssociationsController],
  providers: [AssociationsService],
})
export class AssociationsModule {}

