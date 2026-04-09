import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { ContentModule } from './content/content.module';
import { ParsedDocumentsModule } from './parsed-documents/parsed-documents.module';
import { CategoriesModule } from './categories/categories.module';
import { TagsModule } from './tags/tags.module';
import { OfferingsModule } from './offerings/offerings.module';
import { ReservationsModule } from './reservations/reservations.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { AuditModule } from './audit/audit.module';
import { IdempotencyModule } from './idempotency/idempotency.module';
import { FilesModule } from './files/files.module';
import { DuplicateDetectionModule } from './duplicate-detection/duplicate-detection.module';
import { EncryptionModule } from './encryption/encryption.module';
import { JobsModule } from './jobs/jobs.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    ScheduleModule.forRoot(),
    AuthModule,
    UsersModule,
    RolesModule,
    ContentModule,
    ParsedDocumentsModule,
    CategoriesModule,
    TagsModule,
    OfferingsModule,
    ReservationsModule,
    EnrollmentsModule,
    AuditModule,
    IdempotencyModule,
    FilesModule,
    DuplicateDetectionModule,
    EncryptionModule,
    JobsModule,
    HealthModule,
  ],
})
export class AppModule {}
