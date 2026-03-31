import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async create(userData: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
  }): Promise<UserDocument> {
    const passwordHash = await bcrypt.hash(userData.password, 10);
    const newUser = new this.userModel({
      email: userData.email,
      fullName: userData.fullName,
      phone: userData.phone,
      passwordHash,
    });
    return newUser.save();
  }

  async findByEmail(email: string): Promise<UserDocument | undefined> {
    return this.userModel.findOne({ email }).exec();
  }

  async findByEmailWithPassword(email: string): Promise<UserDocument | undefined> {
    return this.userModel
      .findOne({ email })
      .select('+passwordHash +password')
      .exec();
  }

  async findById(id: string): Promise<UserDocument | undefined> {
    return this.userModel.findById(id).exec();
  }

  async updateProfile(userId: string, dto: { fullName?: string; phone?: string }) {
    return this.userModel
      .findByIdAndUpdate(userId, { $set: dto }, { new: true })
      .exec();
  }

  async updatePasswordHash(userId: string, passwordHash: string) {
    return this.userModel
      .findByIdAndUpdate(userId, { $set: { passwordHash }, $unset: { password: '' } }, { new: true })
      .select('+passwordHash +password')
      .exec();
  }
}
