import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { OfferingsService } from './offerings.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { IsString, IsNumber, IsOptional, IsBoolean, IsDateString, Min, Max } from 'class-validator';

class CreateOfferingDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  assetId?: string;

  @IsNumber()
  @Min(1)
  @Max(5000)
  seatCapacity: number;

  @IsDateString()
  enrollmentWindowStart: string;

  @IsDateString()
  enrollmentWindowEnd: string;

  @IsOptional()
  eligibilityFlags?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  @IsOptional()
  @IsBoolean()
  waitlistEnabled?: boolean;
}

class UpdateOfferingDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5000)
  seatCapacity?: number;

  @IsOptional()
  @IsDateString()
  enrollmentWindowStart?: string;

  @IsOptional()
  @IsDateString()
  enrollmentWindowEnd?: string;

  @IsOptional()
  eligibilityFlags?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  @IsOptional()
  @IsBoolean()
  waitlistEnabled?: boolean;
}

@Controller('offerings')
export class OfferingsController {
  constructor(
    private readonly offeringsService: OfferingsService,
    private readonly enrollmentsService: EnrollmentsService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('enrollment_manager', 'admin')
  async create(
    @Body() dto: CreateOfferingDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.offeringsService.create(
      {
        ...dto,
        enrollmentWindowStart: new Date(dto.enrollmentWindowStart),
        enrollmentWindowEnd: new Date(dto.enrollmentWindowEnd),
      },
      userId,
    );
  }

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.offeringsService.findAll({ page, pageSize, status, search });
  }

  @Get(':id')
  async findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.offeringsService.findById(id);
  }

  @Get(':id/enrollments')
  @UseGuards(RolesGuard)
  @Roles('enrollment_manager', 'admin')
  async getEnrollments(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.enrollmentsService.findAll({ offeringId: id, page, pageSize });
  }

  @Get(':id/waitlist')
  @UseGuards(RolesGuard)
  @Roles('enrollment_manager', 'admin')
  async getWaitlist(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.enrollmentsService.findAll({
      offeringId: id,
      status: 'WAITLISTED',
    });
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('enrollment_manager', 'admin')
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateOfferingDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.offeringsService.update(
      id,
      {
        ...dto,
        enrollmentWindowStart: dto.enrollmentWindowStart
          ? new Date(dto.enrollmentWindowStart)
          : undefined,
        enrollmentWindowEnd: dto.enrollmentWindowEnd
          ? new Date(dto.enrollmentWindowEnd)
          : undefined,
      },
      userId,
    );
  }
}
