import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from '../projects/entities/project.entity';
import { AffinityScore } from '../affinity/entities/affinity-score.entity';
import { NaturalPersonProfile } from '../users/entities/natural-person-profile.entity';
import { FeedService } from './feed.service';
import { FeedController } from './feed.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, AffinityScore, NaturalPersonProfile]),
  ],
  controllers: [FeedController],
  providers: [FeedService],
  exports: [FeedService],
})
export class FeedModule {}
