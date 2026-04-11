import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  IsUUID,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsIn,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EnrollmentsService } from './enrollments.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { IdempotencyKeyHeader } from '../common/decorators/idempotency-key-header.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { EnrollmentStatus } from './enrollment.entity';

class ConfirmReservationDto {
  @IsUUID('4')
  @IsNotEmpty()
  reservationId: string;
}

class CancelEnrollmentDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

class ApproveEnrollmentDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

class EnrollmentListQueryDto {
  @IsOptional()
  @IsUUID('4')
  offeringId?: string;

  @IsOptional()
  @IsIn([
    EnrollmentStatus.WAITLISTED,
    EnrollmentStatus.APPROVED,
    EnrollmentStatus.CONFIRMED,
    EnrollmentStatus.CANCELED,
  ])
  status?: EnrollmentStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

@Controller('enrollments')
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Post('confirm')
  async confirm(
    @Body() dto: ConfirmReservationDto,
    @IdempotencyKeyHeader() idempotencyKey: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.enrollmentsService.confirmReservation(
      dto.reservationId,
      userId,
      idempotencyKey,
    );
  }

  @Post(':id/cancel')
  async cancel(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: CancelEnrollmentDto,
    @IdempotencyKeyHeader() idempotencyKey: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('userRoles') userRoles?: Array<{ role?: { name?: string } }>,
  ) {
    const roles = (userRoles || [])
      .map((ur) => ur?.role?.name)
      .filter((name): name is string => Boolean(name));
    return this.enrollmentsService.cancelEnrollment(
      id,
      userId,
      idempotencyKey,
      dto.reason,
      roles,
    );
  }

  @Post(':id/approve')
  @UseGuards(RolesGuard)
  @Roles('enrollment_manager', 'admin')
  async approve(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: ApproveEnrollmentDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.enrollmentsService.approveEnrollment(id, actorId, dto.reason);
  }

  @Post(':id/confirm-approved')
  @UseGuards(RolesGuard)
  @Roles('enrollment_manager', 'admin')
  async confirmApproved(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @IdempotencyKeyHeader() idempotencyKey: string,
    @CurrentUser('id') actorId: string,
  ) {
    return this.enrollmentsService.confirmApprovedEnrollment(
      id,
      actorId,
      idempotencyKey,
    );
  }

  @Get()
  async findAll(
    @Query() query: EnrollmentListQueryDto,
    @CurrentUser('id') userId?: string,
  ) {
    return this.enrollmentsService.findAll({
      page: query.page,
      pageSize: query.pageSize,
      offeringId: query.offeringId,
      status: query.status,
      userId,
    });
  }

  @Get(':id')
  async findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('userRoles') userRoles?: Array<{ role?: { name?: string } }>,
  ) {
    const roles = (userRoles || [])
      .map((ur) => ur?.role?.name)
      .filter((name): name is string => Boolean(name));
    return this.enrollmentsService.findByIdForActor(id, userId, roles);
  }
}
