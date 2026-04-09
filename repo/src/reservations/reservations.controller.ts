import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { IsUUID, IsNotEmpty } from 'class-validator';
import { ReservationsService } from './reservations.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

class CreateReservationDto {
  @IsUUID('4')
  @IsNotEmpty()
  offeringId: string;
}

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  async create(
    @Body() dto: CreateReservationDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.reservationsService.createReservation(
      dto.offeringId,
      userId,
      idempotencyKey,
    );
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
    return this.reservationsService.findByIdForActor(id, userId, roles);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async release(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('userRoles') userRoles?: Array<{ role?: { name?: string } }>,
  ) {
    const roles = (userRoles || [])
      .map((ur) => ur?.role?.name)
      .filter((name): name is string => Boolean(name));
    await this.reservationsService.releaseReservation(
      id,
      userId,
      idempotencyKey,
      roles,
    );
  }
}
