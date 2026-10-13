import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyOwner } from '../companies/entities/company-owner.entity';
import { CompanyProfile } from '../companies/entities/company-profile.entity';
import { AffinityModule } from '../affinity/affinity.module';
import { StorageModule } from '../storage/storage.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { NaturalPersonProfile } from './entities/natural-person-profile.entity';
import { User } from './entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      NaturalPersonProfile,
      CompanyProfile,
      CompanyOwner,
    ]),
    AffinityModule,
    StorageModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}