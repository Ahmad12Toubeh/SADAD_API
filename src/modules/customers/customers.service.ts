import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { QueryCustomersDto } from './dto/query-customers.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Customer, CustomerDocument } from './schemas/customer.schema';

@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(Customer.name) private readonly customerModel: Model<CustomerDocument>,
  ) {}

  async create(ownerUserId: string, dto: CreateCustomerDto) {
    const doc = await this.customerModel.create({
      ownerUserId: new Types.ObjectId(ownerUserId),
      ...dto,
      status: dto.status ?? 'regular',
    });
    return this.toPublic(doc);
  }

  async findAll(ownerUserId: string, query: QueryCustomersDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const filter: FilterQuery<CustomerDocument> = {
      ownerUserId: new Types.ObjectId(ownerUserId),
    };

    if (query.status) filter.status = query.status;
    if (query.search?.trim()) {
      filter.$text = { $search: query.search.trim() };
    }

    const [items, total] = await Promise.all([
      this.customerModel
        .find(filter)
        .sort(query.search ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.customerModel.countDocuments(filter).exec(),
    ]);

    return {
      items: items.map((d) => this.toPublic(d)),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(ownerUserId: string, id: string) {
    const doc = await this.customerModel.findOne({
      _id: id,
      ownerUserId: new Types.ObjectId(ownerUserId),
    });
    if (!doc) throw new NotFoundException('Customer not found');
    return this.toPublic(doc);
  }

  async update(ownerUserId: string, id: string, dto: UpdateCustomerDto) {
    const doc = await this.customerModel.findOneAndUpdate(
      { _id: id, ownerUserId: new Types.ObjectId(ownerUserId) },
      { $set: dto },
      { new: true },
    );
    if (!doc) throw new NotFoundException('Customer not found');
    return this.toPublic(doc);
  }

  toPublic(doc: CustomerDocument | Customer) {
    const obj = (doc as any).toObject ? (doc as any).toObject() : (doc as any);
    return {
      id: obj._id?.toString?.() ?? obj.id,
      type: obj.type,
      name: obj.name,
      phone: obj.phone,
      email: obj.email ?? null,
      address: obj.address ?? null,
      cr: obj.cr ?? null,
      notes: obj.notes ?? null,
      status: obj.status,
      createdAt: obj.createdAt,
      updatedAt: obj.updatedAt,
    };
  }
}

