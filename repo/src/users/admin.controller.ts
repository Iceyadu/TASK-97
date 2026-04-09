import {
  Controller,
  Post,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { LockoutService } from '../auth/lockout.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../roles/user-role.entity';
import { IsArray, IsUUID } from 'class-validator';

class AssignRolesDto {
  @IsArray()
  @IsUUID('4', { each: true })
  roleIds: string[];
}

@Controller('admin/users')
@UseGuards(RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(
    private readonly authService: AuthService,
    private readonly lockoutService: LockoutService,
    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,
  ) {}

  @Post(':id/reset-password')
  async resetPassword(
    @Param('id', new ParseUUIDPipe({ version: '4' })) userId: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.authService.adminResetPassword(adminId, userId);
  }

  @Post(':id/unlock')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unlock(
    @Param('id', new ParseUUIDPipe({ version: '4' })) userId: string,
    @CurrentUser('id') adminId: string,
  ) {
    await this.lockoutService.unlock(userId, adminId);
  }

  @Post(':id/roles')
  async assignRoles(
    @Param('id', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Body() dto: AssignRolesDto,
    @CurrentUser('id') adminId: string,
  ) {
    // Remove existing roles and assign new ones
    await this.userRoleRepo.delete({ userId });
    const newRoles = dto.roleIds.map((roleId) =>
      this.userRoleRepo.create({
        userId,
        roleId,
        assignedBy: adminId,
      }),
    );
    await this.userRoleRepo.save(newRoles);
    return { userId, roleIds: dto.roleIds };
  }

  @Delete(':id/roles/:roleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeRole(
    @Param('id', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Param('roleId', new ParseUUIDPipe({ version: '4' })) roleId: string,
  ) {
    await this.userRoleRepo.delete({ userId, roleId });
  }
}
