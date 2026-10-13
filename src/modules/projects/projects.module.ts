import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CatalogsModule } from '../catalogs/catalogs.module';
import { AffinityModule } from '../affinity/affinity.module';
import { StorageModule } from '../storage/storage.module';

import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

import { Project } from './entities/project.entity';
import { ProjectRoleRequirement } from './entities/project-role-requirement.entity';
import { ProjectMedia } from './entities/project-media.entity';
import { InterestArea } from '../catalogs/entities/interest-area.entity';
import { TechnicalArea } from '../catalogs/entities/technical-area.entity';
import { NaturalPersonProfile } from '../users/entities/natural-person-profile.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      ProjectRoleRequirement,
      ProjectMedia,
      InterestArea,
      TechnicalArea,
      NaturalPersonProfile,
    ]),
    CatalogsModule,
    AffinityModule,
    StorageModule,
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [TypeOrmModule],
})
export class ProjectsModule {}
