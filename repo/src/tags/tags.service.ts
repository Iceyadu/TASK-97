import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tag } from './tag.entity';

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag)
    private tagRepo: Repository<Tag>,
  ) {}

  async create(name: string): Promise<Tag> {
    const existing = await this.tagRepo.findOne({ where: { name } });
    if (existing) throw new ConflictException('Tag already exists');
    return this.tagRepo.save(this.tagRepo.create({ name }));
  }

  async findAll(query: { search?: string; page?: number; pageSize?: number }) {
    const page = query.page || 1;
    const pageSize = Math.min(query.pageSize || 20, 100);
    const qb = this.tagRepo.createQueryBuilder('t');
    if (query.search) {
      qb.andWhere('t.name ILIKE :s', { s: `%${query.search}%` });
    }
    qb.orderBy('t.name', 'ASC');
    qb.skip((page - 1) * pageSize).take(pageSize);
    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, pageSize };
  }

  async delete(id: string): Promise<void> {
    await this.tagRepo.delete(id);
  }
}
