import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Headers,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { IsUUID, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EnrollmentsService } from './enrollments.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

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

@Controller('enrollments')
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Post('confirm')
  async confirm(
    @Body() dto: ConfirmReservationDto,
    @Headers('idempotency-key') idempotencyKey: string,
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
    @Headers('idempotency-key') idempotencyKey: string,
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
    @Headers('idempotency-key') idempotencyKey: string,
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
    @Query('offeringId') offeringId?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @CurrentUser('id') userId?: string,
  ) {
    return this.enrollmentsService.findAll({
      page,
      pageSize,
      offeringId,
      status,
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
