import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoryRepo: Repository<Category>,
  ) {}

  async create(data: { name: string; parentId?: string }): Promise<Category> {
    let path = `/${data.name}`;
    let depth = 0;

    if (data.parentId) {
      const parent = await this.categoryRepo.findOne({
        where: { id: data.parentId },
      });
      if (!parent) throw new NotFoundException('Parent category not found');
      path = `${parent.path}/${data.name}`;
      depth = parent.depth + 1;
    }

    const category = this.categoryRepo.create({
      name: data.name,
      parentId: data.parentId || null,
      path,
      depth,
    });
    return this.categoryRepo.save(category);
  }

  async findAll(parentId?: string): Promise<Category[]> {
    if (parentId) {
      return this.categoryRepo.find({
        where: { parentId },
        relations: ['children'],
        order: { name: 'ASC' },
      });
    }
    return this.categoryRepo.find({
      relations: ['children'],
      order: { path: 'ASC' },
    });
  }

  async update(id: string, data: { name?: string }): Promise<Category> {
    const cat = await this.categoryRepo.findOne({ where: { id } });
    if (!cat) throw new NotFoundException('Category not found');
    if (data.name) {
      cat.name = data.name;
      // Rebuild path
      const parentPath = cat.path.substring(0, cat.path.lastIndexOf('/'));
      cat.path = `${parentPath}/${data.name}`;
    }
    return this.categoryRepo.save(cat);
  }

  async delete(id: string): Promise<void> {
    const children = await this.categoryRepo.count({ where: { parentId: id } });
    if (children > 0) {
      throw new BadRequestException(
        'Cannot delete category with child categories',
      );
    }
    await this.categoryRepo.delete(id);
  }
}
