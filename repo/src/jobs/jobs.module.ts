import { Module } from '@nestjs/common';
import { ReservationExpiryJob } from './reservation-expiry.job';
import { CleanupJob } from './cleanup.job';
import { ContentParsingJob } from './content-parsing.job';
import { ReservationsModule } from '../reservations/reservations.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { OfferingsModule } from '../offerings/offerings.module';
import { ContentModule } from '../content/content.module';
import { ParsedDocumentsModule } from '../parsed-documents/parsed-documents.module';
import { DuplicateDetectionModule } from '../duplicate-detection/duplicate-detection.module';
import { FilesModule } from '../files/files.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentAssetVersion } from '../content/content-asset-version.entity';
import { Session } from '../auth/session.entity';
import { LoginAttempt } from '../auth/login-attempt.entity';
import { PowChallenge } from '../auth/pow-challenge.entity';

@Module({
  imports: [
    ReservationsModule,
    EnrollmentsModule,
    OfferingsModule,
    ParsedDocumentsModule,
    DuplicateDetectionModule,
    FilesModule,
    TypeOrmModule.forFeature([
      ContentAssetVersion,
      Session,
      LoginAttempt,
      PowChallenge,
    ]),
  ],
  providers: [ReservationExpiryJob, CleanupJob, ContentParsingJob],
})
export class JobsModule {}
