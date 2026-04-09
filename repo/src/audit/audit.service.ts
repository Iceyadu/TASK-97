import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditEvent } from './audit-event.entity';
import { IAuditService } from '../common/interceptors/audit.interceptor';
import { getTraceId } from '../common/interceptors/trace-id.interceptor';

@Injectable()
export class AuditService implements IAuditService {
  constructor(
    @InjectRepository(AuditEvent)
    private auditRepo: Repository<AuditEvent>,
  ) {}

  async recordEvent(event: {
    traceId?: string;
    actorId?: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    changes?: any;
    reason?: string;
    ipAddress?: string;
    metadata?: any;
  }): Promise<void> {
    const auditEvent = this.auditRepo.create({
      traceId: event.traceId || getTraceId(),
      actorId: event.actorId || null,
      action: event.action,
      resourceType: event.resourceType,
      resourceId: event.resourceId || null,
      changes: event.changes || null,
      reason: event.reason || null,
      ipAddress: event.ipAddress || null,
      metadata: event.metadata || null,
    });
    await this.auditRepo.save(auditEvent);
  }

  async findAll(query: {
    page?: number;
    pageSize?: number;
    actorId?: string;
    resourceType?: string;
    resourceId?: string;
    action?: string;
    traceId?: string;
    from?: Date;
    to?: Date;
  }) {
    const page = query.page || 1;
    const pageSize = Math.min(query.pageSize || 20, 100);

    const qb = this.auditRepo.createQueryBuilder('ae');

    if (query.actorId) qb.andWhere('ae.actorId = :actorId', { actorId: query.actorId });
    if (query.resourceType) qb.andWhere('ae.resourceType = :resourceType', { resourceType: query.resourceType });
    if (query.resourceId) qb.andWhere('ae.resourceId = :resourceId', { resourceId: query.resourceId });
    if (query.action) qb.andWhere('ae.action = :action', { action: query.action });
    if (query.traceId) qb.andWhere('ae.traceId = :traceId', { traceId: query.traceId });
    if (query.from) qb.andWhere('ae.timestamp >= :from', { from: query.from });
    if (query.to) qb.andWhere('ae.timestamp <= :to', { to: query.to });

    qb.orderBy('ae.timestamp', 'DESC');
    qb.skip((page - 1) * pageSize).take(pageSize);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, pageSize };
  }

  async findById(id: string): Promise<AuditEvent | null> {
    return this.auditRepo.findOne({ where: { id } });
  }
}
