import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Offering } from './offering.entity';
import { OfferingsService } from './offerings.service';
import { OfferingsController } from './offerings.controller';
import { EnrollmentsModule } from '../enrollments/enrollments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Offering]),
    forwardRef(() => EnrollmentsModule),
  ],
  providers: [OfferingsService],
  controllers: [OfferingsController],
  exports: [OfferingsService, TypeOrmModule],
})
export class OfferingsModule {}
