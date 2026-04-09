import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Offering } from './offering.entity';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class OfferingsService {
  constructor(
    @InjectRepository(Offering)
    private offeringRepo: Repository<Offering>,
    private auditService: AuditService,
  ) {}

  async create(
    data: {
      title: string;
      description?: string;
      assetId?: string;
      seatCapacity: number;
      enrollmentWindowStart: Date;
      enrollmentWindowEnd: Date;
      eligibilityFlags?: Record<string, any>;
      requiresApproval?: boolean;
      waitlistEnabled?: boolean;
    },
    userId: string,
  ): Promise<Offering> {
    if (data.seatCapacity < 1 || data.seatCapacity > 5000) {
      throw new BadRequestException('Seat capacity must be between 1 and 5000');
    }
    if (data.enrollmentWindowEnd <= data.enrollmentWindowStart) {
      throw new BadRequestException(
        'Enrollment window end must be after start',
      );
    }

    const offering = this.offeringRepo.create({
      title: data.title,
      description: data.description || null,
      assetId: data.assetId || null,
      seatCapacity: data.seatCapacity,
      seatsAvailable: data.seatCapacity,
      enrollmentWindowStart: data.enrollmentWindowStart,
      enrollmentWindowEnd: data.enrollmentWindowEnd,
      eligibilityFlags: data.eligibilityFlags || {},
      requiresApproval: data.requiresApproval ?? false,
      waitlistEnabled: data.waitlistEnabled ?? true,
      createdBy: userId,
    });

    const saved = await this.offeringRepo.save(offering);

    await this.auditService.recordEvent({
      action: 'offering.create',
      resourceType: 'offerings',
      resourceId: saved.id,
      actorId: userId,
    });

    return saved;
  }

  async findAll(query: {
    page?: number;
    pageSize?: number;
    status?: string;
    search?: string;
  }) {
    const page = query.page || 1;
    const pageSize = Math.min(query.pageSize || 20, 100);
    const now = new Date();

    const qb = this.offeringRepo.createQueryBuilder('o');

    if (query.search) {
      qb.andWhere('o.title ILIKE :s', { s: `%${query.search}%` });
    }
    if (query.status === 'open') {
      qb.andWhere('o.enrollmentWindowStart <= :now AND o.enrollmentWindowEnd >= :now', { now });
    } else if (query.status === 'closed') {
      qb.andWhere('o.enrollmentWindowEnd < :now', { now });
    } else if (query.status === 'upcoming') {
      qb.andWhere('o.enrollmentWindowStart > :now', { now });
    }

    qb.orderBy('o.enrollmentWindowStart', 'DESC');
    qb.skip((page - 1) * pageSize).take(pageSize);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, pageSize };
  }

  async findById(id: string): Promise<Offering> {
    const offering = await this.offeringRepo.findOne({ where: { id } });
    if (!offering) throw new NotFoundException('Offering not found');
    return offering;
  }

  async update(
    id: string,
    data: Partial<{
      title: string;
      description: string;
      seatCapacity: number;
      enrollmentWindowStart: Date;
      enrollmentWindowEnd: Date;
      eligibilityFlags: Record<string, any>;
      requiresApproval: boolean;
      waitlistEnabled: boolean;
    }>,
    userId: string,
  ): Promise<Offering> {
    const offering = await this.findById(id);

    if (data.seatCapacity !== undefined) {
      if (data.seatCapacity < 1 || data.seatCapacity > 5000) {
        throw new BadRequestException('Seat capacity must be between 1 and 5000');
      }
      const seatsUsed = offering.seatCapacity - offering.seatsAvailable;
      if (data.seatCapacity < seatsUsed) {
        throw new BadRequestException(
          'Cannot reduce capacity below currently used seats',
        );
      }
      offering.seatsAvailable += data.seatCapacity - offering.seatCapacity;
      offering.seatCapacity = data.seatCapacity;
    }

    Object.assign(offering, {
      ...(data.title && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.enrollmentWindowStart && { enrollmentWindowStart: data.enrollmentWindowStart }),
      ...(data.enrollmentWindowEnd && { enrollmentWindowEnd: data.enrollmentWindowEnd }),
      ...(data.eligibilityFlags && { eligibilityFlags: data.eligibilityFlags }),
      ...(data.requiresApproval !== undefined && { requiresApproval: data.requiresApproval }),
      ...(data.waitlistEnabled !== undefined && { waitlistEnabled: data.waitlistEnabled }),
    });

    const saved = await this.offeringRepo.save(offering);

    await this.auditService.recordEvent({
      action: 'offering.update',
      resourceType: 'offerings',
      resourceId: id,
      actorId: userId,
    });

    return saved;
  }
}
