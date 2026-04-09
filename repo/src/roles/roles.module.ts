import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './role.entity';
import { UserRole } from './user-role.entity';
import { RolesService } from './roles.service';

@Module({
  imports: [TypeOrmModule.forFeature([Role, UserRole])],
  providers: [RolesService],
  exports: [RolesService, TypeOrmModule.forFeature([UserRole])],
})
export class RolesModule {}
