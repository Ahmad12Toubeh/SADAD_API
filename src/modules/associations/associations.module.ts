import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AssociationsController } from './associations.controller';
import { AssociationsService } from './associations.service';
import { Association, AssociationSchema } from './schemas/association.schema';
import { UsersModule } from '../users/users.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Association.name, schema: AssociationSchema },
    ]),
    UsersModule,
    SettingsModule,
  ],
  controllers: [AssociationsController],
  providers: [AssociationsService],
})
export class AssociationsModule {}
