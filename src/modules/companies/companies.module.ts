import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyOwner } from './entities/company-owner.entity';
import { CompanyProfile } from './entities/company-profile.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CompanyProfile, CompanyOwner])],
  exports: [TypeOrmModule],
})
export class CompaniesModule {}
