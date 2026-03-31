import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateAssociationDto } from './dto/create-association.dto';
import { UpdateAssociationDto } from './dto/update-association.dto';
import { Association, AssociationDocument } from './schemas/association.schema';

@Injectable()
export class AssociationsService {
  constructor(
    @InjectModel(Association.name)
    private readonly associationModel: Model<AssociationDocument>,
  ) {}

  async create(ownerUserId: string, dto: CreateAssociationDto) {
    const doc = await this.associationModel.create({
      ownerUserId: new Types.ObjectId(ownerUserId),
      ...dto,
      currentMonth: 0,
      status: 'active',
    });
    return this.toPublic(doc);
  }

  async list(ownerUserId: string) {
    const items = await this.associationModel
      .find({ ownerUserId: new Types.ObjectId(ownerUserId) })
      .sort({ createdAt: -1 })
      .limit(200)
      .exec();
    return { items: items.map((i) => this.toPublic(i)) };
  }

  async get(ownerUserId: string, id: string) {
    const doc = await this.associationModel.findOne({
      _id: id,
      ownerUserId: new Types.ObjectId(ownerUserId),
    });
    if (!doc) throw new NotFoundException('Association not found');
    return this.toPublic(doc);
  }

  async update(ownerUserId: string, id: string, dto: UpdateAssociationDto) {
    const doc = await this.associationModel.findOneAndUpdate(
      { _id: id, ownerUserId: new Types.ObjectId(ownerUserId) },
      { $set: dto },
      { new: true },
    );
    if (!doc) throw new NotFoundException('Association not found');
    return this.toPublic(doc);
  }

  private toPublic(doc: any) {
    const obj = doc?.toObject ? doc.toObject() : doc;
    const totalValue = Number(obj.members ?? 0) * Number(obj.monthlyAmount ?? 0);
    return {
      id: obj._id?.toString?.() ?? obj.id,
      name: obj.name,
      members: obj.members,
      monthlyAmount: obj.monthlyAmount,
      myTurn: obj.myTurn,
      currentMonth: obj.currentMonth,
      status: obj.status,
      totalValue,
      createdAt: obj.createdAt,
      updatedAt: obj.updatedAt,
    };
  }
}

