import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { EncryptionService } from '../encryption/encryption.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private encryptionService: EncryptionService,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['userRoles', 'userRoles.role'],
    });
    if (!user) throw new NotFoundException('User not found');
    return this.decryptSensitiveFields(user);
  }

  private decryptSensitiveFields(user: User): User {
    if (user.governmentId) {
      try {
        user.governmentId = this.encryptionService.decrypt(user.governmentId);
      } catch {
        // Field may not be encrypted yet (legacy data)
      }
    }
    if (user.employeeId) {
      try {
        user.employeeId = this.encryptionService.decrypt(user.employeeId);
      } catch {
        // Field may not be encrypted yet (legacy data)
      }
    }
    return user;
  }

  async findAll(query: {
    page?: number;
    pageSize?: number;
    search?: string;
    role?: string;
    isActive?: boolean;
  }) {
    const page = query.page || 1;
    const pageSize = Math.min(query.pageSize || 20, 100);

    const qb = this.userRepo
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.userRoles', 'ur')
      .leftJoinAndSelect('ur.role', 'r');

    if (query.search) {
      qb.andWhere(
        '(u.username ILIKE :search OR u.displayName ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }
    if (query.role) {
      qb.andWhere('r.name = :role', { role: query.role });
    }
    if (query.isActive !== undefined) {
      qb.andWhere('u.isActive = :isActive', { isActive: query.isActive });
    }

    qb.orderBy('u.createdAt', 'DESC');
    qb.skip((page - 1) * pageSize).take(pageSize);

    const [items, total] = await qb.getManyAndCount();
    return { items: items.map((u) => this.decryptSensitiveFields(u)), total, page, pageSize };
  }

  async updateProfile(
    userId: string,
    data: {
      displayName?: string;
      department?: string;
      governmentId?: string;
      employeeId?: string;
    },
  ): Promise<User> {
    const user = await this.findById(userId);
    if (data.displayName !== undefined) user.displayName = data.displayName;
    if (data.department !== undefined) user.department = data.department || null;
    if (data.governmentId !== undefined) {
      user.governmentId = data.governmentId
        ? this.encryptionService.encrypt(data.governmentId)
        : null;
    }
    if (data.employeeId !== undefined) {
      user.employeeId = data.employeeId
        ? this.encryptionService.encrypt(data.employeeId)
        : null;
    }
    const saved = await this.userRepo.save(user);
    return this.decryptSensitiveFields(saved);
  }
}
