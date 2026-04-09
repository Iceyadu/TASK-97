import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditEvent } from './audit-event.entity';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditEvent])],
  providers: [
    AuditService,
    { provide: 'AuditService', useExisting: AuditService },
  ],
  controllers: [AuditController],
  exports: [AuditService, 'AuditService'],
})
export class AuditModule {}
