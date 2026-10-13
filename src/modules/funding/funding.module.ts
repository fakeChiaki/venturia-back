import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyProfile } from '../companies/entities/company-profile.entity';
import { FundingOffer } from '../projects/entities/funding-offer.entity';
import { Project } from '../projects/entities/project.entity';
import { NaturalPersonProfile } from '../users/entities/natural-person-profile.entity';
import { FundingController } from './funding.controller';
import { FundingService } from './funding.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FundingOffer,
      Project,
      CompanyProfile,
      NaturalPersonProfile,
    ]),
  ],
  controllers: [FundingController],
  providers: [FundingService],
})
export class FundingModule {}
