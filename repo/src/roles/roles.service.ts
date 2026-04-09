import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './role.entity';

const SEED_ROLES = [
  { name: 'admin', description: 'Full system access' },
  { name: 'content_manager', description: 'Manage content assets, categories, tags' },
  { name: 'enrollment_manager', description: 'Manage offerings, enrollments, waitlists' },
  { name: 'learner', description: 'Browse content, enroll in offerings' },
];

@Injectable()
export class RolesService implements OnModuleInit {
  constructor(
    @InjectRepository(Role)
    private roleRepo: Repository<Role>,
  ) {}

  async onModuleInit(): Promise<void> {
    for (const seed of SEED_ROLES) {
      const existing = await this.roleRepo.findOne({
        where: { name: seed.name },
      });
      if (!existing) {
        await this.roleRepo.save(this.roleRepo.create(seed));
      }
    }
  }

  async findAll(): Promise<Role[]> {
    return this.roleRepo.find();
  }

  async findByName(name: string): Promise<Role | null> {
    return this.roleRepo.findOne({ where: { name } });
  }
}
