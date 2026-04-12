import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { UsersService } from './users.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  providers: [UsersService],
  // Export MongooseModule so other modules importing UsersModule
  // can inject the User model via @InjectModel(User.name).
  exports: [UsersService, MongooseModule],
})
export class UsersModule {}
