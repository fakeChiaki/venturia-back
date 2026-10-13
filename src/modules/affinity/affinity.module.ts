import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { NaturalPersonProfile } from '../users/entities/natural-person-profile.entity';
import { Project } from '../projects/entities/project.entity';
import { AffinityScore } from './entities/affinity-score.entity';
import { AffinityController } from './affinity.controller';
import { AffinityService } from './affinity.service';
import { AffinityCalculatorService } from './affinity-calculator.service';
import { AffinityQueueService } from './affinity-queue.service';
import { AffinityProcessor, AFFINITY_QUEUE } from './affinity.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([AffinityScore, Project, NaturalPersonProfile]),
    BullModule.registerQueue({ name: AFFINITY_QUEUE }),
  ],
  controllers: [AffinityController],
  providers: [AffinityService, AffinityCalculatorService, AffinityQueueService, AffinityProcessor],
  exports: [AffinityQueueService, AffinityService],
})
export class AffinityModule {}
