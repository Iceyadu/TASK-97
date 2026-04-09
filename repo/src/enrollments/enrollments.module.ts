import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Enrollment } from './enrollment.entity';
import { EnrollmentStateTransition } from './enrollment-state-transition.entity';
import { EnrollmentsService } from './enrollments.service';
import { EnrollmentsController } from './enrollments.controller';
import { OfferingsModule } from '../offerings/offerings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Enrollment, EnrollmentStateTransition]),
    forwardRef(() => OfferingsModule),
  ],
  providers: [EnrollmentsService],
  controllers: [EnrollmentsController],
  exports: [EnrollmentsService, TypeOrmModule],
})
export class EnrollmentsModule {}
